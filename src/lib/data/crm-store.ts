import "server-only";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Client, ClientMessage, ClientNote } from "@/lib/domain/types";
import { logger } from "@/lib/infra/logger";
import { buildClientSeed } from "@/lib/seed/clients";

/*
 * Demo-mode storage for the CRM. The rest of the demo store is rebuilt on every restart,
 * but client records are business data someone typed in, so they are written through to a
 * git-ignored JSON file and survive restarts. On a read-only filesystem (serverless) it
 * degrades to memory only and says so in the log. With Supabase configured this file is
 * never touched.
 */

export interface CrmData {
  version: 1;
  clients: Client[];
  messages: ClientMessage[];
  notes: ClientNote[];
}

const FILE = process.env.CRM_DEMO_FILE ?? join(process.cwd(), ".data", "crm.json");
const g = globalThis as unknown as { __skylarkCrm?: CrmData; __skylarkCrmWritable?: boolean };

function load(): CrmData {
  try {
    const parsed = JSON.parse(readFileSync(/*turbopackIgnore: true*/ FILE, "utf8")) as CrmData;
    if (parsed?.version === 1 && Array.isArray(parsed.clients)) {
      parsed.clients.forEach((c) => (c.userId ??= null));
      return parsed;
    }
  } catch {
    // Missing or unreadable: start from the seed below.
  }
  const seeded: CrmData = { version: 1, ...buildClientSeed() };
  write(seeded);
  return seeded;
}

function write(data: CrmData) {
  if (g.__skylarkCrmWritable === false) return;
  try {
    mkdirSync(/*turbopackIgnore: true*/ dirname(FILE), { recursive: true });
    // Write-then-rename so a crash mid-write never leaves a truncated file behind.
    const tmp = `${FILE}.tmp`;
    writeFileSync(/*turbopackIgnore: true*/ tmp, JSON.stringify(data, null, 2));
    renameSync(/*turbopackIgnore: true*/ tmp, FILE);
    g.__skylarkCrmWritable = true;
  } catch (err) {
    g.__skylarkCrmWritable = false;
    logger.warn("crm.demo_store_not_persisted", { file: FILE, error: err });
  }
}

export function crmStore(): CrmData {
  g.__skylarkCrm ??= load();
  return g.__skylarkCrm;
}

export function saveCrm() {
  if (g.__skylarkCrm) write(g.__skylarkCrm);
}
