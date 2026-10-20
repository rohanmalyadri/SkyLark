"use client";

import { Check, Info, Lock, Plus, ShieldCheck, X } from "lucide-react";
import { useId, useState } from "react";
import {
  saveBackgroundAnswersAction,
  saveDeliveryPreferencesAction,
  saveEligibilityAnswersAction,
  saveScreeningAnswersAction,
  saveSelfIdentificationAction,
} from "@/app/actions/candidate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Panel, PanelHeader, SectionLabel } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import type { AnswerCompleteness, ApplicationAnswers, DisabilityStatus, GenderIdentity, RaceEthnicity, Ternary, VeteranStatus } from "@/lib/domain/types";
import { DISABILITY_STATUSES, GENDER_IDENTITIES, RACE_ETHNICITIES, VETERAN_STATUSES } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";
import { cn } from "@/lib/utils";

/*
 * The answer vault. Every employer portal asks the same two dozen questions; this answers
 * them once. The hard rule throughout: a question with no answer stays visibly unanswered.
 * There is no default "No" anywhere in this form.
 */

type FieldErrors = Record<string, string[] | undefined>;
const first = (errors: FieldErrors | undefined, key: string) => errors?.[key]?.[0];

/* ---------- Tri-state yes / no / unanswered ---------- */

function YesNo({ label, hint, value, onChange, error }: { label: string; hint?: string; value: boolean | null; onChange: (v: boolean | null) => void; error?: string }) {
  const options: { v: boolean | null; label: string }[] = [
    { v: true, label: "Yes" },
    { v: false, label: "No" },
  ];
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        {error && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            aria-pressed={value === o.v}
            onClick={() => onChange(o.v)}
            className={cn(
              "h-7 min-w-12 rounded-sm border px-2.5 text-xs font-medium transition-colors",
              value === o.v ? "border-accent bg-accent-soft text-accent" : "border-line-strong bg-bg text-muted hover:border-fg/40 hover:text-fg",
            )}
          >
            {o.label}
          </button>
        ))}
        {value !== null && (
          <button type="button" onClick={() => onChange(null)} aria-label={`Clear answer to: ${label}`} className="grid size-7 place-items-center rounded-sm text-subtle transition-colors hover:text-fg">
            <X className="size-3.5" />
          </button>
        )}
        {value === null && <Badge className="ml-1">Unanswered</Badge>}
      </div>
    </div>
  );
}

/** A section wrapper that saves on its own and reports its own completeness. */
function AnswerSectionPanel({
  title,
  description,
  progress,
  children,
  onSave,
  pending,
  footnote,
}: {
  title: string;
  description: string;
  progress?: { answered: number; total: number };
  children: React.ReactNode;
  onSave: () => void;
  pending: boolean;
  footnote?: React.ReactNode;
}) {
  const done = progress && progress.answered === progress.total;
  return (
    <Panel>
      <PanelHeader
        title={title}
        description={description}
        action={progress ? <Badge tone={done ? "success" : "warning"} dot>{done ? "Complete" : `${progress.answered}/${progress.total}`}</Badge> : undefined}
      />
      <div className="px-5 py-2">{children}</div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        <div className="min-w-0 text-xs text-muted">{footnote}</div>
        <Button size="md" onClick={onSave} loading={pending}>
          Save
        </Button>
      </footer>
    </Panel>
  );
}

/* ---------- Work eligibility ---------- */

function EligibilitySection({ initial, progress }: { initial: ApplicationAnswers["eligibility"]; progress: { answered: number; total: number } }) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const startId = useId();
  const noticeId = useId();
  const save = useAction(saveEligibilityAnswersAction, { onSuccess: () => setErrors({}) });
  const set = <K extends keyof typeof v>(k: K) => (value: (typeof v)[K]) => setV((p) => ({ ...p, [k]: value }));

  return (
    <AnswerSectionPanel
      title="Work eligibility"
      description="Right-to-work questions. These also sharpen your match scores."
      progress={progress}
      pending={save.pending}
      onSave={async () => {
        const res = await save.execute(v);
        if (!res.ok) setErrors(res.fieldErrors ?? {});
      }}
      footnote="Used for eligibility screening as well as application forms."
    >
      <YesNo label="Are you 18 or over?" value={v.isOver18} onChange={set("isOver18")} />
      <YesNo label="Are you already authorised to work in your target countries?" value={v.authorizedInTargetCountries} onChange={set("authorizedInTargetCountries")} />
      <YesNo label="Do you need visa sponsorship now?" value={v.needsSponsorshipNow} onChange={set("needsSponsorshipNow")} />
      <YesNo
        label="Will you need sponsorship in the future?"
        hint="Employers ask this separately — a student visa holder often answers no to the first and yes to this."
        value={v.needsFutureSponsorship}
        onChange={set("needsFutureSponsorship")}
      />
      <YesNo label="Can you perform the essential functions of the role, with or without accommodation?" value={v.canPerformEssentialFunctions} onChange={set("canPerformEssentialFunctions")} />
      <YesNo label="Can you provide documents proving your right to work?" value={v.canProvideRightToWorkDocuments} onChange={set("canProvideRightToWorkDocuments")} />
      <div className="grid gap-4 py-4 sm:grid-cols-2">
        <Field label="Earliest start date" htmlFor={startId} error={first(errors, "earliestStartDate")}>
          <Input id={startId} type="date" value={v.earliestStartDate} onChange={(e) => set("earliestStartDate")(e.target.value)} aria-invalid={Boolean(first(errors, "earliestStartDate"))} />
        </Field>
        <Field label="Notice period" htmlFor={noticeId} hint="Days you must give your current employer." optional error={first(errors, "noticePeriodDays")}>
          <Input
            id={noticeId}
            type="number"
            min={0}
            max={365}
            value={v.noticePeriodDays ?? ""}
            onChange={(e) => set("noticePeriodDays")(e.target.value === "" ? null : Number(e.target.value))}
            aria-invalid={Boolean(first(errors, "noticePeriodDays"))}
          />
        </Field>
      </div>
    </AnswerSectionPanel>
  );
}

/* ---------- Employer questions ---------- */

function ScreeningSection({ initial, progress }: { initial: ApplicationAnswers["screening"]; progress: { answered: number; total: number } }) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const onsiteId = useId();
  const save = useAction(saveScreeningAnswersAction, { onSuccess: () => setErrors({}) });
  const set = <K extends keyof typeof v>(k: K) => (value: (typeof v)[K]) => setV((p) => ({ ...p, [k]: value }));

  return (
    <AnswerSectionPanel
      title="Employer questions"
      description="The relationship and history questions large employers ask on every form."
      progress={progress}
      pending={save.pending}
      onSave={async () => {
        const res = await save.execute(v);
        if (!res.ok) setErrors(res.fieldErrors ?? {});
      }}
    >
      <YesNo label="Have you applied to or worked for this employer before?" hint="Answer for employers generally; your specialist adjusts it per application." value={v.appliedOrWorkedHereBefore} onChange={set("appliedOrWorkedHereBefore")} />
      <YesNo label="Are you related to anyone currently employed there?" value={v.relatedToCurrentEmployee} onChange={set("relatedToCurrentEmployee")} />
      {v.relatedToCurrentEmployee && (
        <div className="py-3">
          <Field label="Who, and how are you related?" error={first(errors, "relationshipDetails")}>
            <Input value={v.relationshipDetails} onChange={(e) => set("relationshipDetails")(e.target.value)} placeholder="Cousin, works in a different department" aria-invalid={Boolean(first(errors, "relationshipDetails"))} />
          </Field>
        </div>
      )}
      <YesNo label="Have you ever left a role because of a policy violation?" value={v.leftRoleForPolicyViolation} onChange={set("leftRoleForPolicyViolation")} />
      {v.leftRoleForPolicyViolation && (
        <div className="py-3">
          <Field label="What happened?" hint="Your words, used verbatim. Employers prefer a short factual account." error={first(errors, "policyViolationDetails")}>
            <Textarea value={v.policyViolationDetails} onChange={(e) => set("policyViolationDetails")(e.target.value)} aria-invalid={Boolean(first(errors, "policyViolationDetails"))} />
          </Field>
        </div>
      )}
      <YesNo label="Are you currently represented by a recruitment agency?" value={v.representedByAgency} onChange={set("representedByAgency")} />
      <YesNo label="Are you bound by a non-compete or non-solicit agreement?" value={v.boundByNonCompete} onChange={set("boundByNonCompete")} />
      {v.boundByNonCompete && (
        <div className="py-3">
          <Field label="What does it restrict, and when does it end?" error={first(errors, "nonCompeteDetails")}>
            <Textarea value={v.nonCompeteDetails} onChange={(e) => set("nonCompeteDetails")(e.target.value)} aria-invalid={Boolean(first(errors, "nonCompeteDetails"))} />
          </Field>
        </div>
      )}
      <div className="py-4">
        <Field label="Days a week you can be in an office" htmlFor={onsiteId} hint="Used when a role lists a hybrid requirement." error={first(errors, "onsiteDaysPerWeek")}>
          <Select id={onsiteId} value={v.onsiteDaysPerWeek ?? ""} onChange={(e) => set("onsiteDaysPerWeek")(e.target.value === "" ? null : Number(e.target.value))}>
            <option value="">Not answered</option>
            {[0, 1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {d === 0 ? "Remote only" : `${d} day${d === 1 ? "" : "s"}`}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </AnswerSectionPanel>
  );
}

/* ---------- Background checks ---------- */

function BackgroundSection({ initial, progress }: { initial: ApplicationAnswers["background"]; progress: { answered: number; total: number } }) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useAction(saveBackgroundAnswersAction, { onSuccess: () => setErrors({}) });
  const set = <K extends keyof typeof v>(k: K) => (value: (typeof v)[K]) => setV((p) => ({ ...p, [k]: value }));

  return (
    <AnswerSectionPanel
      title="Background checks"
      description="Consents and disclosures. We submit exactly what you write here, never a guess."
      progress={progress}
      pending={save.pending}
      onSave={async () => {
        const res = await save.execute(v);
        if (!res.ok) setErrors(res.fieldErrors ?? {});
      }}
      footnote="A conviction is not a bar to most roles. An inaccurate answer is."
    >
      <YesNo label="Do you consent to a background check if an offer is made?" value={v.consentToBackgroundCheck} onChange={set("consentToBackgroundCheck")} />
      <YesNo label="Do you consent to a drug screen where one is required?" value={v.consentToDrugScreen} onChange={set("consentToDrugScreen")} />
      <YesNo label="Have you ever refused or failed an employer drug test?" value={v.refusedOrFailedDrugTest} onChange={set("refusedOrFailedDrugTest")} />
      <YesNo label="Have you been convicted of a felony?" value={v.convictedOfFelony} onChange={set("convictedOfFelony")} />
      {v.convictedOfFelony && (
        <div className="py-3">
          <Field label="Details" hint="What, when, and anything since. Submitted word for word." error={first(errors, "felonyDetails")}>
            <Textarea value={v.felonyDetails} onChange={(e) => set("felonyDetails")(e.target.value)} aria-invalid={Boolean(first(errors, "felonyDetails"))} />
          </Field>
        </div>
      )}
      <YesNo label="Are there charges pending or an open investigation against you?" value={v.pendingChargesOrInvestigation} onChange={set("pendingChargesOrInvestigation")} />
      {v.pendingChargesOrInvestigation && (
        <div className="py-3">
          <Field label="Details" error={first(errors, "pendingDetails")}>
            <Textarea value={v.pendingDetails} onChange={(e) => set("pendingDetails")(e.target.value)} aria-invalid={Boolean(first(errors, "pendingDetails"))} />
          </Field>
        </div>
      )}
    </AnswerSectionPanel>
  );
}

/* ---------- Voluntary self-identification ---------- */

const GENDER_LABEL: Record<GenderIdentity, string> = {
  woman: "Woman",
  man: "Man",
  non_binary: "Non-binary",
  self_describe: "I prefer to self-describe",
  decline: "I decline to answer",
};

const RACE_LABEL: Record<RaceEthnicity, string> = {
  american_indian_or_alaska_native: "American Indian or Alaska Native",
  asian: "Asian",
  black_or_african_american: "Black or African American",
  hispanic_or_latino: "Hispanic or Latino",
  native_hawaiian_or_pacific_islander: "Native Hawaiian or Other Pacific Islander",
  white: "White",
  two_or_more: "Two or more races",
  decline: "I decline to answer",
};

const VETERAN_LABEL: Record<VeteranStatus, string> = {
  not_a_veteran: "I am not a protected veteran",
  protected_veteran: "I identify as one or more classifications of protected veteran",
  veteran_not_protected: "I am a veteran but not a protected veteran",
  decline: "I decline to answer",
};

const DISABILITY_LABEL: Record<DisabilityStatus, string> = {
  yes: "Yes, I have (or have had) a disability",
  no: "No, I do not have a disability",
  decline: "I decline to answer",
};

const TERNARY_LABEL: Record<Ternary, string> = { yes: "Yes", no: "No", decline: "I decline to answer" };

function SelfIdSection({ initial }: { initial: ApplicationAnswers["selfIdentification"] }) {
  const [v, setV] = useState(initial);
  const save = useAction(saveSelfIdentificationAction);
  const set = <K extends keyof typeof v>(k: K) => (value: (typeof v)[K]) => setV((p) => ({ ...p, [k]: value }));
  const toggleRace = (r: RaceEthnicity) =>
    setV((p) => ({
      ...p,
      // "Decline" is exclusive: choosing it clears the rest, and choosing a race clears it.
      raceEthnicity: r === "decline" ? (p.raceEthnicity.includes("decline") ? [] : ["decline"]) : p.raceEthnicity.includes(r) ? p.raceEthnicity.filter((x) => x !== r) : [...p.raceEthnicity.filter((x) => x !== "decline"), r],
    }));

  return (
    <Panel>
      <PanelHeader
        title="Voluntary self-identification"
        description="US employers are required to ask. You are never required to answer."
        action={
          <Badge tone="accent">
            <Lock className="size-3" /> Withheld from staff
          </Badge>
        }
      />
      <div className="border-b border-line bg-surface-2/50 px-5 py-3">
        <p className="flex gap-2 text-xs leading-relaxed text-muted">
          <ShieldCheck className="mt-px size-4 shrink-0 text-accent" aria-hidden />
          <span>
            This section never reaches your match scores, your ranking, or any AI prompt. Your specialist cannot see it until they unlock it for a specific form, and every unlock is recorded in the audit
            log.
          </span>
        </p>
      </div>
      <div className="space-y-5 px-5 py-5">
        <Field label="Gender" optional>
          <Select value={v.gender ?? ""} onChange={(e) => set("gender")((e.target.value || null) as GenderIdentity | null)}>
            <option value="">Not answered</option>
            {GENDER_IDENTITIES.map((g) => (
              <option key={g} value={g}>
                {GENDER_LABEL[g]}
              </option>
            ))}
          </Select>
        </Field>
        {v.gender === "self_describe" && (
          <Field label="How would you describe your gender?" optional>
            <Input value={v.genderSelfDescribed} onChange={(e) => set("genderSelfDescribed")(e.target.value)} />
          </Field>
        )}
        <Field label="Are you Hispanic or Latino?" optional>
          <Select value={v.hispanicOrLatino ?? ""} onChange={(e) => set("hispanicOrLatino")((e.target.value || null) as Ternary | null)}>
            <option value="">Not answered</option>
            {(["yes", "no", "decline"] as Ternary[]).map((t) => (
              <option key={t} value={t}>
                {TERNARY_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <div>
          <SectionLabel>Race or ethnicity</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RACE_ETHNICITIES.map((r) => {
              const on = v.raceEthnicity.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleRace(r)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-sm border px-2.5 text-xs transition-colors",
                    on ? "border-accent bg-accent-soft text-accent" : "border-line-strong bg-bg text-muted hover:border-fg/40 hover:text-fg",
                  )}
                >
                  {on ? <Check className="size-3" /> : <Plus className="size-3" />}
                  {RACE_LABEL[r]}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Veteran status" optional>
          <Select value={v.veteranStatus ?? ""} onChange={(e) => set("veteranStatus")((e.target.value || null) as VeteranStatus | null)}>
            <option value="">Not answered</option>
            {VETERAN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VETERAN_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Disability status" optional>
          <Select value={v.disabilityStatus ?? ""} onChange={(e) => set("disabilityStatus")((e.target.value || null) as DisabilityStatus | null)}>
            <option value="">Not answered</option>
            {DISABILITY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {DISABILITY_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <footer className="flex items-center justify-end border-t border-line px-5 py-3.5">
        <Button size="md" onClick={() => void save.execute(v)} loading={save.pending}>
          Save
        </Button>
      </footer>
    </Panel>
  );
}

/* ---------- Delivery preferences ---------- */

function DeliverySection({ initial, cap }: { initial: ApplicationAnswers["delivery"]; cap: number }) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [company, setCompany] = useState("");
  const targetId = useId();
  const scoreId = useId();
  const save = useAction(saveDeliveryPreferencesAction, { onSuccess: () => setErrors({}) });
  const set = <K extends keyof typeof v>(k: K) => (value: (typeof v)[K]) => setV((p) => ({ ...p, [k]: value }));

  const addCompany = () => {
    const name = company.trim();
    if (!name || v.excludedCompanies.some((c) => c.toLowerCase() === name.toLowerCase())) return setCompany("");
    set("excludedCompanies")([...v.excludedCompanies, name]);
    setCompany("");
  };

  return (
    <AnswerSectionPanel
      title="How we apply for you"
      description="The rules your specialist follows every working day."
      pending={save.pending}
      onSave={async () => {
        const res = await save.execute(v);
        if (!res.ok) setErrors(res.fieldErrors ?? {});
      }}
      footnote={`Your plan allows up to ${cap} applications a working day.`}
    >
      <div className="grid gap-4 py-4 sm:grid-cols-2">
        <Field label="Applications a day" htmlFor={targetId} hint={`Leave blank for your plan's maximum of ${cap}.`} error={first(errors, "dailyTarget")}>
          <Input
            id={targetId}
            type="number"
            min={1}
            max={cap}
            value={v.dailyTarget ?? ""}
            placeholder={String(cap)}
            onChange={(e) => set("dailyTarget")(e.target.value === "" ? null : Number(e.target.value))}
            aria-invalid={Boolean(first(errors, "dailyTarget"))}
          />
        </Field>
        <Field label="Minimum match score" htmlFor={scoreId} hint="We skip anything below this, even if it means a lighter day." error={first(errors, "minScore")}>
          <Input id={scoreId} type="number" min={0} max={100} value={v.minScore} onChange={(e) => set("minScore")(Number(e.target.value))} aria-invalid={Boolean(first(errors, "minScore"))} />
        </Field>
      </div>

      <div className="border-t border-line py-4">
        <SectionLabel>Never apply to</SectionLabel>
        <p className="mt-1 text-xs text-muted">Your current employer, companies you&apos;ve had a bad experience with, anywhere you&apos;re already in process.</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {v.excludedCompanies.map((c) => (
            <span key={c} className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-line-strong bg-surface px-2.5 text-xs text-fg">
              {c}
              <button type="button" onClick={() => set("excludedCompanies")(v.excludedCompanies.filter((x) => x !== c))} aria-label={`Stop excluding ${c}`} className="text-subtle transition-colors hover:text-danger">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2.5 flex gap-2">
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCompany();
              }
            }}
            placeholder="Company name"
            aria-label="Company to exclude"
            className="max-w-xs"
          />
          <Button size="md" variant="secondary" onClick={addCompany} disabled={!company.trim()}>
            Add
          </Button>
        </div>
      </div>

      <label className="flex items-start justify-between gap-4 border-t border-line py-4">
        <span className="min-w-0">
          <span className="block text-[13px] text-fg">Show me each application before it goes out</span>
          <span className="mt-0.5 block text-xs text-muted">Slower, but nothing is submitted without your nod.</span>
        </span>
        <Switch checked={v.requireApprovalBeforeSubmit} onCheckedChange={(c) => set("requireApprovalBeforeSubmit")(c)} aria-label="Require my approval before submitting" />
      </label>

      <div className="border-t border-line py-4">
        <label className="flex items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-[13px] text-fg">Pause applications</span>
            <span className="mt-0.5 block text-xs text-muted">Keeps your plan and your place; we simply stop applying until you resume.</span>
          </span>
          <Switch checked={v.paused} onCheckedChange={(c) => set("paused")(c)} aria-label="Pause applications" />
        </label>
        {v.paused && (
          <div className="mt-3">
            <Field label="Why are you pausing?" hint="So your specialist knows when to pick things back up." error={first(errors, "pauseReason")}>
              <Input value={v.pauseReason} onChange={(e) => set("pauseReason")(e.target.value)} placeholder="On holiday until the 20th" aria-invalid={Boolean(first(errors, "pauseReason"))} />
            </Field>
          </div>
        )}
      </div>
    </AnswerSectionPanel>
  );
}

/* ---------- The page body ---------- */

export function AnswerVault({ answers, completeness, cap }: { answers: ApplicationAnswers; completeness: AnswerCompleteness; cap: number }) {
  const section = (key: string) => {
    const s = completeness.sections.find((x) => x.section === key);
    return { answered: s?.answered ?? 0, total: s?.total ?? 0 };
  };

  return (
    <div className="space-y-6">
      <Panel className={cn(completeness.readyToSubmit ? "border-success/30 bg-success-soft/40" : "border-warning/30 bg-warning-soft/40")}>
        <div className="flex flex-wrap items-center gap-4 px-5 py-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-bg">
            {completeness.readyToSubmit ? <Check className="size-[18px] text-success" /> : <Info className="size-[18px] text-warning" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-fg">
              {completeness.readyToSubmit ? "Your answers are complete" : `${completeness.blocking.length} question${completeness.blocking.length === 1 ? "" : "s"} still need an answer`}
            </p>
            <p className="mt-0.5 text-[13px] text-muted">
              {completeness.readyToSubmit
                ? "Your specialist can complete any employer form without coming back to you."
                : "We can't submit applications for you until these are answered — an employer form can't be left half-filled."}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-2xl tabular-nums text-fg">{completeness.score}%</p>
            <p className="text-[11px] uppercase tracking-[0.08em] text-subtle">Complete</p>
          </div>
        </div>
        {!completeness.readyToSubmit && (
          <ul className="flex flex-wrap gap-1.5 border-t border-line px-5 py-3">
            {completeness.blocking.slice(0, 8).map((q) => (
              <li key={q}>
                <Badge tone="warning">{q}</Badge>
              </li>
            ))}
            {completeness.blocking.length > 8 && (
              <li>
                <Badge>+{completeness.blocking.length - 8} more</Badge>
              </li>
            )}
          </ul>
        )}
      </Panel>

      <EligibilitySection initial={answers.eligibility} progress={section("eligibility")} />
      <ScreeningSection initial={answers.screening} progress={section("screening")} />
      <BackgroundSection initial={answers.background} progress={section("background")} />
      <DeliverySection initial={answers.delivery} cap={cap} />
      <SelfIdSection initial={answers.selfIdentification} />
    </div>
  );
}
