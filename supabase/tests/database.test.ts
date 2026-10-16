import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Applies every migration to an in-process Postgres and checks the security model:
 * row isolation between candidates, column-level privileges, staff access and the queue functions.
 */
const root = join(__dirname, "..");
const db = new PGlite({ extensions: { pgcrypto } });

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const STAFF = "00000000-0000-4000-8000-00000000000c";

async function asUser(uid: string, fn: () => Promise<void>) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try {
    await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

beforeAll(async () => {
  await db.exec(readFileSync(join(root, "tests", "supabase-stubs.sql"), "utf8"));
  const migrations = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const file of migrations) await db.exec(readFileSync(join(root, "migrations", file), "utf8"));

  // Signing up through Supabase Auth inserts into auth.users; the trigger provisions app rows.
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${A}', 'a@example.com', '{"full_name":"Candidate A"}'),
      ('${B}', 'b@example.com', '{"full_name":"Candidate B"}'),
      ('${STAFF}', 'staff@example.com', '{"full_name":"Reviewer"}');
    update public.users set role = 'reviewer' where id = '${STAFF}';
    insert into public.companies (id, name, domain) values ('10000000-0000-4000-8000-000000000001', 'Acme', 'acme.example');
    insert into public.jobs (id, company_id, title, seniority, work_mode, source, source_url, external_id, fingerprint, posted_at)
      values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Engineer', 'senior', 'remote', 'test', 'https://acme.example/1', '1', 'fp-1', now());
    insert into public.applications (id, user_id, job_id, status) values
      ('30000000-0000-4000-8000-00000000000a', '${A}', '20000000-0000-4000-8000-000000000001', 'preparing'),
      ('30000000-0000-4000-8000-00000000000b', '${B}', '20000000-0000-4000-8000-000000000001', 'saved');
  `);
}, 60_000);

describe("schema & auth trigger", () => {
  it("provisions users and settings from auth.users", async () => {
    const users = await db.query<{ full_name: string }>(`select full_name from public.users order by email`);
    expect(users.rows.map((r) => r.full_name)).toEqual(["Candidate A", "Candidate B", "Reviewer"]);
    const settings = await db.query(`select 1 from public.user_settings`);
    expect(settings.rows).toHaveLength(3);
  });

  it("seeds configurable pricing", async () => {
    const plans = await db.query<{ id: string }>(`select id from public.plans order by sort_order`);
    expect(plans.rows.map((r) => r.id)).toEqual(["entry", "professional", "executive"]);
  });
});

describe("row level security", () => {
  it("isolates applications between candidates", async () => {
    await asUser(A, async () => {
      const rows = await db.query<{ user_id: string }>(`select user_id from public.applications`);
      expect(rows.rows).toEqual([{ user_id: A }]);
    });
  });

  it("prevents a candidate from writing another candidate's rows", async () => {
    await asUser(A, async () => {
      await db.query(`update public.applications set notes = 'x' where user_id = '${B}'`);
    });
    const b = await db.query<{ notes: string }>(`select notes from public.applications where user_id = '${B}'`);
    expect(b.rows[0]!.notes).toBe("");
  });

  it("blocks self-promotion to admin via column privileges", async () => {
    await asUser(A, async () => {
      await expect(db.query(`update public.users set role = 'admin' where id = '${A}'`)).rejects.toThrow(/permission denied/i);
      await db.query(`update public.users set full_name = 'Renamed' where id = '${A}'`);
    });
    const a = await db.query<{ role: string; full_name: string }>(`select role, full_name from public.users where id = '${A}'`);
    expect(a.rows[0]).toEqual({ role: "candidate", full_name: "Renamed" });
  });

  it("only allows candidate-authored events on own applications", async () => {
    await asUser(A, async () => {
      await db.query(`insert into public.application_events (application_id, type, actor, message) values ('30000000-0000-4000-8000-00000000000a', 'note', 'candidate', 'hi')`);
      await expect(
        db.query(`insert into public.application_events (application_id, type, actor, message) values ('30000000-0000-4000-8000-00000000000a', 'ai', 'ai', 'spoof')`),
      ).rejects.toThrow(/row-level security/i);
      await expect(
        db.query(`insert into public.application_events (application_id, type, actor, message) values ('30000000-0000-4000-8000-00000000000b', 'note', 'candidate', 'x')`),
      ).rejects.toThrow(/row-level security/i);
    });
  });

  it("lets staff read operational data but not candidates", async () => {
    await db.exec(`insert into public.audit_logs (actor_role, action, entity_type) values ('system', 'test', 'test')`);
    await asUser(A, async () => {
      expect((await db.query(`select 1 from public.audit_logs`)).rows).toHaveLength(0);
    });
    await asUser(STAFF, async () => {
      expect((await db.query(`select 1 from public.audit_logs`)).rows).toHaveLength(1);
      expect((await db.query(`select 1 from public.applications`)).rows).toHaveLength(2);
    });
  });

  it("hides closed jobs from anonymous visitors", async () => {
    await db.exec(`update public.jobs set status = 'closed'`);
    await db.exec(`set role anon`);
    const rows = await db.query(`select 1 from public.jobs`);
    await db.exec(`reset role`);
    await db.exec(`update public.jobs set status = 'active'`);
    expect(rows.rows).toHaveLength(0);
  });

  it("scopes storage objects to the owner's folder", async () => {
    await asUser(A, async () => {
      await db.query(`insert into storage.objects (bucket_id, name) values ('documents', '${A}/resume.pdf')`);
      await expect(db.query(`insert into storage.objects (bucket_id, name) values ('documents', '${B}/evil.pdf')`)).rejects.toThrow(/row-level security/i);
    });
  });
});

describe("pipeline functions", () => {
  it("claims due jobs exactly once and is not callable by end users", async () => {
    await db.exec(`insert into public.background_jobs (type, idempotency_key) values ('match_job', 'k1'), ('match_job', 'k2')`);
    await expect(db.exec(`insert into public.background_jobs (type, idempotency_key) values ('match_job', 'k1')`)).rejects.toThrow(/duplicate key/i);
    const first = await db.query(`select * from public.claim_background_jobs(5)`);
    const second = await db.query(`select * from public.claim_background_jobs(5)`);
    expect(first.rows).toHaveLength(2);
    expect(second.rows).toHaveLength(0);
    await asUser(A, async () => {
      await expect(db.query(`select * from public.claim_background_jobs(5)`)).rejects.toThrow(/permission denied/i);
    });
  });

  it("enforces fixed-window rate limits", async () => {
    const hits: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await db.query<{ ok: boolean }>(`select public.rate_limit_hit('t', 3, 60) as ok`);
      hits.push(r.rows[0]!.ok);
    }
    expect(hits).toEqual([true, true, true, false]);
  });
});

describe("verification, skill requests and accounts", () => {
  it("lets candidates read only their own verification and never write it", async () => {
    await db.exec(`
      insert into public.candidate_profiles (user_id) values ('${A}'), ('${B}') on conflict do nothing;
      insert into public.profile_verifications (user_id, status, note) values ('${A}', 'pending', ''), ('${B}', 'pending', '') on conflict (user_id) do nothing;
    `);
    await asUser(A, async () => {
      const rows = await db.query<{ user_id: string }>(`select user_id from public.profile_verifications`);
      expect(rows.rows).toEqual([{ user_id: A }]);
      await expect(db.query(`update public.profile_verifications set status = 'approved', reviewed_at = now() where user_id = '${A}'`)).rejects.toThrow(/permission denied/i);
      await expect(db.query(`insert into public.skill_requests (user_id, name) values ('${A}', 'Self approved')`)).rejects.toThrow(/permission denied/i);
    });
    await asUser(STAFF, async () => {
      expect((await db.query(`select 1 from public.profile_verifications`)).rows).toHaveLength(2);
    });
    const a = await db.query<{ status: string }>(`select status from public.profile_verifications where user_id = '${A}'`);
    expect(a.rows[0]!.status).toBe("pending");
  });

  it("keeps review timestamps consistent with the decision", async () => {
    await expect(db.query(`update public.profile_verifications set status = 'approved' where user_id = '${A}'`)).rejects.toThrow(/check constraint/i);
    await db.query(`update public.profile_verifications set status = 'approved', reviewed_at = now(), reviewed_by = '${STAFF}' where user_id = '${A}'`);
  });

  it("scopes skill requests to their owner and staff, one pending request per skill", async () => {
    await db.exec(`insert into public.skill_requests (user_id, name) values ('${A}', 'Hyperbaric welding'), ('${B}', 'Glassblowing')`);
    await expect(db.exec(`insert into public.skill_requests (user_id, name) values ('${A}', 'hyperbaric WELDING')`)).rejects.toThrow(/duplicate key/i);
    await asUser(A, async () => {
      expect((await db.query<{ name: string }>(`select name from public.skill_requests`)).rows).toEqual([{ name: "Hyperbaric welding" }]);
    });
    await asUser(STAFF, async () => {
      expect((await db.query(`select 1 from public.skill_requests`)).rows).toHaveLength(2);
    });
  });

  it("allows one account per email regardless of case", async () => {
    await expect(db.exec(`insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000ff', 'A@EXAMPLE.COM')`)).rejects.toThrow(/duplicate key|unique/i);
  });

  it("tracks when listings were last seen at their source", async () => {
    const r = await db.query<{ seen: boolean }>(`select last_seen_at is not null as seen from public.jobs limit 1`);
    expect(r.rows[0]!.seen).toBe(true);
  });
});

describe("the managed service", () => {
  it("gives a candidate their own answer vault and nobody else's", async () => {
    await asUser(A, async () => {
      await db.query(`insert into public.application_answers (user_id, eligibility) values ('${A}', '{"isOver18": true}'::jsonb)
                      on conflict (user_id) do update set eligibility = '{"isOver18": true}'::jsonb`);
      const mine = await db.query<{ user_id: string }>(`select user_id from public.application_answers`);
      expect(mine.rows).toEqual([{ user_id: A }]);
    });
    // Writing into someone else's vault is refused by the insert policy.
    await asUser(A, async () => {
      await expect(db.query(`insert into public.application_answers (user_id) values ('${B}')`)).rejects.toThrow(/row-level security/i);
    });
  });

  it("never exposes EEO self-identification to a browser session, even the owner's", async () => {
    await db.exec(`update public.application_answers set self_identification = '{"gender":"woman"}'::jsonb where user_id = '${A}'`);

    // The column grant is revoked from both roles, so no session can select it at all.
    await asUser(A, async () => {
      await expect(db.query(`select self_identification from public.application_answers where user_id = '${A}'`)).rejects.toThrow(/permission denied/i);
      // The rest of the row is still readable, so the vault stays usable.
      const rest = await db.query(`select eligibility from public.application_answers where user_id = '${A}'`);
      expect(rest.rows).toHaveLength(1);
    });
    await asUser(STAFF, async () => {
      await expect(db.query(`select self_identification from public.application_answers`)).rejects.toThrow(/permission denied/i);
    });

    // Only the service role, which bypasses RLS and column grants, can read it.
    const privileged = await db.query<{ self_identification: { gender: string } }>(`select self_identification from public.application_answers where user_id = '${A}'`);
    expect(privileged.rows[0]!.self_identification.gender).toBe("woman");
  });

  it("lets a candidate read their delivery record but never write one", async () => {
    await db.exec(`insert into public.delivery_runs (id, user_id, day, target, submitted, status) values
      ('40000000-0000-4000-8000-00000000000a', '${A}', current_date, 25, 25, 'delivered'),
      ('40000000-0000-4000-8000-00000000000b', '${B}', current_date, 10, 2, 'in_progress')`);

    await asUser(A, async () => {
      const rows = await db.query<{ user_id: string }>(`select user_id from public.delivery_runs`);
      expect(rows.rows).toEqual([{ user_id: A }]);
      // A candidate claiming work was done for them would make the number worthless.
      await expect(db.query(`update public.delivery_runs set submitted = 99 where user_id = '${A}'`)).rejects.toThrow(/permission denied/i);
      await expect(db.query(`insert into public.delivery_runs (user_id, day) values ('${A}', current_date - 1)`)).rejects.toThrow(/permission denied/i);
    });
    await asUser(STAFF, async () => {
      const rows = await db.query(`select user_id from public.delivery_runs`);
      expect(rows.rows).toHaveLength(2);
    });
  });

  it("holds one run per candidate per day", async () => {
    await expect(db.query(`insert into public.delivery_runs (user_id, day) values ('${A}', current_date)`)).rejects.toThrow(/duplicate key/i);
  });

  it("keeps the lead list away from candidates and read-only for staff", async () => {
    await db.exec(`insert into public.leads (name, email, city, message) values ('Ravi Menon', 'ravi@example.com', 'Kochi', 'Help me apply')`);

    await asUser(A, async () => {
      // A lead list is a competitor's shopping list: candidates see none of it.
      const rows = await db.query(`select id from public.leads`);
      expect(rows.rows).toHaveLength(0);
      await expect(db.query(`insert into public.leads (name, email) values ('Spam', 'spam@example.com')`)).rejects.toThrow(/permission denied/i);
    });
    await asUser(STAFF, async () => {
      const rows = await db.query(`select name from public.leads`);
      expect(rows.rows).toEqual([{ name: "Ravi Menon" }]);
      await expect(db.query(`update public.leads set status = 'won'`)).rejects.toThrow(/permission denied/i);
    });
  });

  it("publishes live promo codes but lets nobody redeem one from the browser", async () => {
    await db.exec(`insert into public.promo_codes (code, kind, value, description) values
      ('LIVE20', 'percent', 20, 'Live'),
      ('DEAD20', 'percent', 20, 'Expired');
      update public.promo_codes set expires_at = now() - interval '1 day' where code = 'DEAD20';`);

    await asUser(A, async () => {
      // The pricing page quotes a code before sign-in, so live codes are public...
      const rows = await db.query<{ code: string }>(`select code from public.promo_codes`);
      expect(rows.rows.map((r) => r.code)).toEqual(["LIVE20"]);
      // ...but counting a redemption is a server-only act.
      await expect(db.query(`update public.promo_codes set redemptions = redemptions + 1 where code = 'LIVE20'`)).rejects.toThrow(/permission denied/i);
      await expect(db.query(`select public.redeem_promo_code('LIVE20')`)).rejects.toThrow(/permission denied/i);
    });
  });

  it("counts a redemption exactly up to the cap", async () => {
    await db.exec(`insert into public.promo_codes (code, kind, value, max_redemptions) values ('CAPPED', 'amount', 25, 2)`);
    const take = async () => (await db.query<{ redeem_promo_code: boolean }>(`select public.redeem_promo_code('CAPPED')`)).rows[0]!.redeem_promo_code;
    expect(await take()).toBe(true);
    expect(await take()).toBe(true);
    // The third caller is refused rather than pushing the counter past the cap.
    expect(await take()).toBe(false);
    const row = await db.query<{ redemptions: number }>(`select redemptions from public.promo_codes where code = 'CAPPED'`);
    expect(row.rows[0]!.redemptions).toBe(2);
  });

  it("refuses to redeem an expired or inactive code", async () => {
    const take = async (code: string) => (await db.query<{ redeem_promo_code: boolean }>(`select public.redeem_promo_code('${code}')`)).rows[0]!.redeem_promo_code;
    expect(await take("DEAD20")).toBe(false);
    await db.exec(`insert into public.promo_codes (code, kind, value, active) values ('OFFCODE', 'percent', 10, false)`);
    expect(await take("OFFCODE")).toBe(false);
    expect(await take("NOSUCHCODE")).toBe(false);
  });

  it("shows a partner their own row and their own referrals only", async () => {
    await db.exec(`insert into public.partners (id, user_id, name, email, promo_code, link_token) values
      ('50000000-0000-4000-8000-00000000000a', '${A}', 'Partner A', 'pa@example.com', 'PARTNERA', 'tokenaaaaaaaaaaa'),
      ('50000000-0000-4000-8000-00000000000b', null, 'Partner B', 'pb@example.com', 'PARTNERB', 'tokenbbbbbbbbbbb');
      insert into public.referrals (partner_id, user_id, promo_code, status) values
      ('50000000-0000-4000-8000-00000000000a', '${B}', 'PARTNERA', 'converted'),
      ('50000000-0000-4000-8000-00000000000b', null, 'PARTNERB', 'visited');`);

    await asUser(A, async () => {
      const partners = await db.query<{ name: string }>(`select name from public.partners`);
      expect(partners.rows).toEqual([{ name: "Partner A" }]);
      const refs = await db.query<{ promo_code: string }>(`select promo_code from public.referrals`);
      expect(refs.rows).toEqual([{ promo_code: "PARTNERA" }]);
      // Payout terms are not something a partner edits themselves.
      await expect(db.query(`update public.partners set payout = '{"perReferral": 9999}'::jsonb where id = '50000000-0000-4000-8000-00000000000a'`)).rejects.toThrow(/permission denied/i);
    });
    await asUser(B, async () => {
      const partners = await db.query(`select name from public.partners`);
      expect(partners.rows).toHaveLength(0);
    });
    await asUser(STAFF, async () => {
      const partners = await db.query(`select name from public.partners`);
      expect(partners.rows).toHaveLength(2);
    });
  });

  it("keeps promo codes and share tokens unique", async () => {
    await expect(db.query(`insert into public.partners (name, email, promo_code, link_token) values ('Dup', 'dup@example.com', 'PARTNERA', 'tokenccccccccccc')`)).rejects.toThrow(/duplicate key/i);
    await expect(db.query(`insert into public.partners (name, email, promo_code, link_token) values ('Dup', 'dup2@example.com', 'UNIQUEC', 'tokenaaaaaaaaaaa')`)).rejects.toThrow(/duplicate key/i);
  });

  it("credits a referred account to a partner only once", async () => {
    await expect(
      db.query(`insert into public.referrals (partner_id, user_id, promo_code, status) values ('50000000-0000-4000-8000-00000000000a', '${B}', 'PARTNERA', 'signed_up')`),
    ).rejects.toThrow(/duplicate key/i);
  });

  it("rejects a malformed promo code and an impossible percentage", async () => {
    await expect(db.query(`insert into public.promo_codes (code, kind, value) values ('lowercase', 'percent', 10)`)).rejects.toThrow(/violates check constraint/i);
    await expect(db.query(`insert into public.promo_codes (code, kind, value) values ('TOOBIG', 'percent', 150)`)).rejects.toThrow(/violates check constraint/i);
  });

  it("gives every plan a daily application quota", async () => {
    const plans = await db.query<{ id: string; per_day: number }>(`select id, (limits->>'applicationsPerDay')::int as per_day from public.plans order by sort_order`);
    expect(plans.rows).toEqual([
      { id: "entry", per_day: 10 },
      { id: "professional", per_day: 25 },
      { id: "executive", per_day: 40 },
    ]);
  });
});
