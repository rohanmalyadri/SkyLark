import { AlertTriangle, ArrowLeft, BadgeCheck, ExternalLink, FileText, GitBranch, Info, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RefreshGithubButton, VerificationControls } from "@/components/admin/verification-controls";
import { StatusBadge } from "@/components/app/match";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { requireStaff } from "@/lib/auth/dal";
import { AUTH_STATUS_LABEL, countryName, SENIORITY_LABEL, VERIFICATION_META } from "@/lib/domain/constants";
import type { ProfileFlag } from "@/lib/domain/types";
import { AppError } from "@/lib/infra/errors";
import { candidateDetail } from "@/lib/services/admin";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Candidate review" };

export default function CandidatePage({ params }: PageProps<"/admin/candidates/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Candidate params={params} />
    </Suspense>
  );
}

const when = (iso: string) => formatDate(iso, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="min-w-0 text-[13px] text-fg">{children}</dd>
    </div>
  );
}

function FlagItem({ flag }: { flag: ProfileFlag }) {
  const warn = flag.severity === "warning";
  return (
    <li className={cn("flex gap-3 rounded-md border px-3 py-2.5 text-[13px]", warn ? "border-warning/30 bg-warning-soft/40" : "border-line")}>
      {warn ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-label="Warning" /> : <Info className="mt-0.5 size-4 shrink-0 text-subtle" aria-label="Note" />}
      <span className="text-fg">{flag.message}</span>
    </li>
  );
}

async function Candidate({ params }: { params: PageProps<"/admin/candidates/[id]">["params"] }) {
  await requireStaff();
  const { id } = await params;
  let data;
  try {
    data = await candidateDetail(id);
  } catch (err) {
    if (err instanceof AppError && err.code === "not_found") notFound();
    throw err;
  }
  const { user, profile, verification, resumes, applications, subscription, reviewerName, history } = data;
  const meta = verification ? VERIFICATION_META[verification.status] : null;
  const gh = verification?.enrichment.github;
  const warnings = verification?.flags.filter((f) => f.severity === "warning") ?? [];
  const notes = verification?.flags.filter((f) => f.severity !== "warning") ?? [];
  const verified = new Set(gh?.status === "verified" ? gh.verifiedSkills : []);

  return (
    <>
      <Link href="/admin/candidates" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> Candidates
      </Link>
      <div className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar name={user.fullName} src={user.avatarUrl} className="size-12 text-base" />
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-subtle">Candidate review</p>
            <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">{user.fullName}</h1>
            <p className="truncate text-[13px] text-muted">
              {user.email} · joined {formatDate(user.createdAt, { month: "short", day: "numeric", year: "numeric" })} · {subscription?.planId ?? "entry"} plan
            </p>
          </div>
        </div>
        {meta && (
          <div className="flex flex-col items-start gap-1 md:items-end">
            <Badge tone={meta.tone} dot>{meta.label}</Badge>
            <p className="text-xs text-subtle">
              Submitted {timeAgo(verification!.submittedAt)}
              {verification!.reviewedAt && ` · reviewed ${timeAgo(verification!.reviewedAt)}${reviewerName ? ` by ${reviewerName}` : ""}`}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {(warnings.length > 0 || notes.length > 0) && (
            <Panel>
              <PanelHeader title="Automatic checks" description="Inconsistencies and unverifiable details found when the profile was saved. They don't block the candidate; you decide." />
              <ul className="space-y-2 p-5">
                {[...warnings, ...notes].map((f) => (
                  <FlagItem key={f.code} flag={f} />
                ))}
              </ul>
            </Panel>
          )}

          {!profile ? (
            <Panel>
              <PanelHeader title="Profile" description="Not completed yet — the candidate hasn't finished onboarding." />
            </Panel>
          ) : (
            <>
              <Panel>
                <PanelHeader title="Profile" description={`Last updated ${when(profile.updatedAt)}`} />
                <dl className="divide-y divide-line">
                  <Row label="Headline">{profile.headline || <span className="text-subtle">—</span>}</Row>
                  {profile.summary && <Row label="Summary"><p className="whitespace-pre-line text-muted">{profile.summary}</p></Row>}
                  <Row label="Location">{[profile.location.city, profile.location.region, countryName(profile.location.country)].filter(Boolean).join(", ") || "—"}</Row>
                  <Row label="Experience">{`${SENIORITY_LABEL[profile.seniority]} · ${profile.yearsExperience} years`}</Row>
                  <Row label="Work authorization">
                    <div className="flex flex-wrap gap-1.5">
                      {profile.workAuthorizations.length ? profile.workAuthorizations.map((a) => <Badge key={a.country}>{`${countryName(a.country)} · ${AUTH_STATUS_LABEL[a.status]}`}</Badge>) : <span className="text-muted">None listed</span>}
                      {profile.requiresSponsorship && <Badge tone="warning">Needs sponsorship elsewhere</Badge>}
                    </div>
                  </Row>
                  <Row label="Looking for">{profile.preferredRoles.join(", ") || "—"} {profile.preferredCountries.length > 0 && <span className="text-muted">in {profile.preferredCountries.map(countryName).join(", ")}</span>}</Row>
                  <Row label="Links">
                    <ul className="space-y-1">
                      {(["github", "linkedin", "portfolio"] as const).map((k) =>
                        profile.links[k] ? (
                          <li key={k} className="flex flex-wrap items-center gap-2">
                            <a href={profile.links[k]} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-accent hover:underline">
                              {profile.links[k]} <ExternalLink className="size-3" aria-hidden />
                            </a>
                            {k === "github" && gh?.status === "verified" && <Badge tone="success">Account exists (GitHub API)</Badge>}
                            {k === "github" && gh && gh.status !== "verified" && <Badge tone="warning">Not confirmed</Badge>}
                            {k === "linkedin" && <Badge>Self-reported</Badge>}
                          </li>
                        ) : null,
                      )}
                      {!profile.links.github && !profile.links.linkedin && !profile.links.portfolio && <li className="text-muted">None</li>}
                    </ul>
                  </Row>
                </dl>
              </Panel>

              <Panel>
                <PanelHeader title="Skills" description={verified.size ? "All skills are self-reported. Green ones also appear in the candidate's public GitHub repositories, which is supporting evidence rather than proof of proficiency." : "All skills are self-reported and were checked against the skill vocabularies when saved."} />
                <ul className="flex flex-wrap gap-1.5 p-5">
                  {profile.skills.map((s) => (
                    <li key={s.name}>
                      <Badge tone={verified.has(s.name) ? "success" : "neutral"}>
                        {verified.has(s.name) && <BadgeCheck className="size-3" aria-label="Seen in public GitHub repositories" />}
                        {s.name} · L{s.level} · {s.years}y
                      </Badge>
                    </li>
                  ))}
                  {profile.skills.length === 0 && <li className="text-[13px] text-muted">No skills listed</li>}
                </ul>
              </Panel>

              <Panel>
                <PanelHeader title="Experience" />
                {profile.experience.length === 0 ? (
                  <p className="px-5 pb-5 text-[13px] text-muted">No roles listed.</p>
                ) : (
                  <ol className="divide-y divide-line">
                    {profile.experience.map((e) => (
                      <li key={e.id} className="px-5 py-4">
                        <p className="text-[13px] font-medium">
                          {e.title} · {e.company}
                        </p>
                        <p className="text-xs text-subtle">
                          {e.startDate} – {e.endDate ?? "present"}
                        </p>
                        {e.highlights.length > 0 && (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-muted">
                            {e.highlights.map((h, i) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        )}
                        {e.skills.length > 0 && <p className="mt-2 text-xs text-subtle">Skills: {e.skills.join(", ")}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>

              <Panel>
                <PanelHeader title="Education" />
                {profile.education.length === 0 ? (
                  <p className="px-5 pb-5 text-[13px] text-muted">No education listed.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {profile.education.map((e) => (
                      <li key={e.id} className="px-5 py-3 text-[13px]">
                        <span className="font-medium">{e.degree}</span>, {e.field} · <span className="text-muted">{e.school}</span> · <span className="tabular text-subtle">{e.year}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </>
          )}

          {gh && (
            <Panel>
              <PanelHeader
                title="GitHub"
                description={gh.status === "verified" ? `Public data fetched ${timeAgo(gh.fetchedAt)} from the GitHub REST API` : gh.error ?? "Not confirmed"}
                action={<RefreshGithubButton userId={user.id} />}
              />
              {gh.status === "verified" ? (
                <div className="space-y-4 px-5 pb-5">
                  <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
                    <div><dt className="text-xs text-subtle">Username</dt><dd><a href={gh.profileUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">{gh.username}</a></dd></div>
                    <div><dt className="text-xs text-subtle">Name on GitHub</dt><dd>{gh.name ?? "—"}</dd></div>
                    <div><dt className="text-xs text-subtle">Public repos</dt><dd className="tabular">{gh.publicRepos}</dd></div>
                    <div><dt className="text-xs text-subtle">Account since</dt><dd>{gh.accountCreatedAt ? formatDate(gh.accountCreatedAt, { month: "short", year: "numeric" }) : "—"}</dd></div>
                  </dl>
                  {gh.languages.length > 0 && <p className="text-[13px] text-muted">Languages: {gh.languages.map((l) => `${l.name} (${l.repos})`).join(", ")}</p>}
                  {gh.projects.length > 0 && (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {gh.projects.map((p) => (
                        <li key={p.url} className="rounded-md border border-line p-3">
                          <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-[13px] font-medium hover:underline">
                            <GitBranch className="size-3.5 text-subtle" aria-hidden /> {p.name}
                          </a>
                          {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{p.description}</p>}
                          <p className="mt-1.5 flex items-center gap-2 text-xs text-subtle">
                            {p.language && <span>{p.language}</span>}
                            <span className="inline-flex items-center gap-0.5"><Star className="size-3" aria-hidden /> {p.stars}</span>
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </Panel>
          )}
        </div>

        <aside className="space-y-6">
          <Panel>
            <PanelHeader title="Decision" description={meta?.description} />
            <div className="p-5">
              {verification?.note && (
                <div className="mb-4 rounded-md border border-line bg-surface-2/60 p-3 text-[13px]">
                  <p className="text-xs text-subtle">Current note to candidate</p>
                  <p className="mt-1 whitespace-pre-line">{verification.note}</p>
                </div>
              )}
              <VerificationControls userId={user.id} status={verification?.status ?? null} hasProfile={!!profile} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Documents" />
            {resumes.length === 0 ? (
              <p className="px-5 pb-5 text-[13px] text-muted">No resume uploaded.</p>
            ) : (
              <ul className="divide-y divide-line">
                {resumes.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-[13px]">
                    <FileText className="size-4 shrink-0 text-subtle" aria-hidden />
                    <a href={`/api/resumes/${r.id}?owner=${user.id}`} className="min-w-0 flex-1 truncate hover:underline">
                      {r.name}
                    </a>
                    {r.isPrimary && <Badge>Primary</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Applications" description={`${applications.length} total`} />
            {applications.length > 0 && (
              <ul className="divide-y divide-line">
                {applications.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]">
                    <span className="min-w-0 truncate">
                      {a.job.title} <span className="text-subtle">· {a.job.company.name}</span>
                    </span>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Verification history" />
            {history.length === 0 ? (
              <p className="px-5 pb-5 text-[13px] text-muted">No decisions yet.</p>
            ) : (
              <ol className="space-y-3 px-5 pb-5">
                {history.map((h) => (
                  <li key={h.id} className="text-[13px]">
                    <p>
                      <span className="font-medium">{h.actorName}</span> <span className="text-muted">{h.action.replace("profile.verification.", "").replace("_", " ")}</span>
                    </p>
                    {typeof h.meta.note === "string" && <p className="mt-0.5 text-xs text-muted">“{h.meta.note}”</p>}
                    <p className="text-xs text-subtle">{when(h.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
