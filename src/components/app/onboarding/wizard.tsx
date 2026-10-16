"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, FileCheck2, Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { completeOnboardingAction, uploadResumeAction } from "@/app/actions/candidate";
import { AvatarField } from "@/components/app/profile/avatar-field";
import { AuthorizationEditor, CountryChips, CurrencySelect, EducationEditor, ExperienceEditor, LinkFields, LocationFields, RolesInput, Segmented, SenioritySelect, SkillsEditor, cleanDraft, toDraft, type FieldErrors, type ProfileDraft } from "@/components/app/profile/fields";
import { textProblem } from "@/lib/validation/text";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { InlineError } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import type { CandidateProfile } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";
import { cn } from "@/lib/utils";

const STEPS = ["Resume", "About you", "Work authorization", "Preferences", "Skills & experience"] as const;

export function OnboardingWizard({ profile, firstName, fullName, avatarUrl, hasResume }: { profile: CandidateProfile; firstName: string; fullName: string; avatarUrl: string | null; hasResume: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<ProfileDraft>(() => {
    const draft = toDraft(profile);
    return draft.experience.length ? draft : { ...draft, experience: [{ id: crypto.randomUUID(), company: "", title: "", startDate: "", endDate: null, description: "", highlights: [], skills: [] }] };
  });
  const [uploaded, setUploaded] = useState<string | null>(hasResume ? "Resume on file" : null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [fieldErrors, setFieldErrors] = useState<{ headline?: string; country?: string; region?: string; city?: string }>({});
  // Unknown until the region list for the chosen country has loaded.
  const [hasRegions, setHasRegions] = useState<boolean | null>(null);
  const onRegionAvailability = useCallback((v: boolean) => setHasRegions(v), []);
  const [finishing, setFinishing] = useState<{ phase: number; matches: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ProfileDraft>(k: K, v: ProfileDraft[K]) => {
    setD((p) => ({ ...p, [k]: v }));
    setStepError(null);
  };

  const upload = useAction(uploadResumeAction, {
    onSuccess: (res) => {
      setUploaded(res.name);
      const ex = res.extracted;
      if (!ex) return;
      setD((p) => ({
        ...p,
        headline: p.headline || ex.headline || "",
        yearsExperience: p.yearsExperience || ex.yearsExperience || 0,
        skills: p.skills.length ? p.skills : ex.skills,
      }));
    },
  });
  const complete = useAction(completeOnboardingAction, { successToast: false });

  const validate = (): string | null => {
    if (step === 1) {
      const errs: typeof fieldErrors = {};
      if (!d.headline.trim()) errs.headline = "Add a headline";
      else if (textProblem(d.headline, "Headline")) errs.headline = textProblem(d.headline, "Headline")!;
      if (!d.location.country) errs.country = "Choose your country";
      else if (hasRegions !== false && !d.location.region) errs.region = hasRegions === null ? "Wait for the list to load, then choose a state" : "Choose your state or region";
      if (!d.location.city.trim()) errs.city = "Choose your city";
      setFieldErrors(errs);
      if (Object.keys(errs).length) return "A few details are missing above.";
    }
    if (step === 2 && d.workAuthorizations.length === 0 && !d.requiresSponsorship) return "Add at least one country you're authorized to work in, or turn on sponsorship.";
    if (step === 3 && (d.preferredRoles.length === 0 || d.preferredCountries.length === 0)) return "Choose at least one role and one target country.";
    if (step === 4 && d.skills.length < 3) return "Add at least three skills so we can score roles accurately.";
    if (step === 4) {
      const now = new Date().toISOString().slice(0, 7);
      const role = d.experience.find((e) => e.title.trim() || e.company.trim());
      if (role && (!role.title.trim() || !role.company.trim())) return "Add both a title and a company for your most recent role, or remove it.";
      if (role && (!role.startDate || role.startDate > now || (role.endDate && role.endDate < role.startDate))) return "Check the dates on your most recent role.";
      if (role && (textProblem(role.title, "Job title") || textProblem(role.company, "Company"))) return "Check your most recent role for typos.";
    }
    return null;
  };

  const go = (to: number) => {
    if (to > step) {
      const e = validate();
      if (e) return setStepError(e);
    }
    setStepError(null);
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finish = async () => {
    const e = validate();
    if (e) return setStepError(e);
    setFinishing({ phase: 0, matches: 0 });
    const timers = [1, 2].map((p) => window.setTimeout(() => setFinishing((f) => (f ? { ...f, phase: Math.max(f.phase, p) } : f)), p * 900));
    const res = await complete.execute(cleanDraft(d));
    if (!res.ok) {
      timers.forEach(clearTimeout);
      setFinishing(null);
      setServerErrors(res.fieldErrors ?? {});
      const keys = Object.keys(res.fieldErrors ?? {});
      // Jump back to the step that owns the first problem so the inline message is visible.
      const owner = (k: string) => (k.startsWith("location") || k === "headline" || k === "summary" || k.startsWith("links") ? 1 : k.startsWith("workAuthorizations") || k.startsWith("relocation") ? 2 : k.startsWith("preferred") || k.startsWith("salary") ? 3 : 4);
      if (keys.length) {
        const target = Math.min(...keys.map(owner));
        if (target === 1) setFieldErrors({ headline: res.fieldErrors?.headline?.[0], country: res.fieldErrors?.["location.country"]?.[0], region: res.fieldErrors?.["location.region"]?.[0], city: res.fieldErrors?.["location.city"]?.[0] });
        setStep(target);
      }
      setStepError(keys.length ? Object.values(res.fieldErrors ?? {})[0]?.[0] ?? res.error : res.error);
      return;
    }
    window.setTimeout(() => setFinishing({ phase: 3, matches: res.data.scored }), 1900);
    window.setTimeout(() => router.push("/dashboard"), 3400);
  };

  if (finishing) return <Finishing phase={finishing.phase} matches={finishing.matches} countries={d.preferredCountries.length} />;

  return (
    <div>
      <ol className="mb-10 grid grid-cols-5 gap-2" aria-label="Onboarding progress">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined}>
            <button type="button" onClick={() => i < step && go(i)} disabled={i >= step} className="w-full text-left">
              <span className={cn("block h-0.5 rounded-full transition-colors duration-300", i <= step ? "bg-accent" : "bg-black/10")} />
              <span className={cn("mt-2 hidden text-xs sm:block", i === step ? "text-fg" : i < step ? "text-muted" : "text-subtle")}>{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <div key={step} className="reveal" style={{ ["--rise" as string]: "6px" }}>
          {step === 0 && (
            <StepShell title={`Hi ${firstName} — let's start with your resume`} body="We'll read it to prefill your skills and experience. You'll confirm everything before it's used.">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) {
                    const fd = new FormData();
                    fd.set("file", f);
                    void upload.execute(fd);
                  }
                }}
                className="flex flex-col items-center rounded-xl border border-dashed border-line-strong px-6 py-12 text-center"
              >
                {uploaded ? <FileCheck2 className="size-6 text-success" /> : <UploadCloud className={cn("size-6 text-subtle", upload.pending && "animate-pulse text-accent")} />}
                <p className="mt-4 text-sm font-medium">{upload.pending ? "Reading your resume…" : uploaded ? uploaded : "Drop your resume here"}</p>
                <p className="mt-1 text-xs text-subtle">{uploaded ? "Skills and headline were prefilled where we could." : "PDF, DOCX or TXT · up to 5 MB · private to you"}</p>
                {!upload.pending && (
                  <Button variant="secondary" size="sm" className="mt-5" onClick={() => fileRef.current?.click()}>
                    {uploaded ? "Upload a different file" : "Choose file"}
                  </Button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  className="sr-only"
                  accept=".pdf,.docx,.txt"
                  aria-label="Upload resume"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const fd = new FormData();
                    fd.set("file", f);
                    void upload.execute(fd);
                  }}
                />
              </div>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell title="About you" body="How you'll be introduced to employers.">
              <div className="mb-6 rounded-lg border border-line p-4">
                <AvatarField name={fullName} avatarUrl={avatarUrl} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Headline" htmlFor="o-headline" className="sm:col-span-2" error={fieldErrors.headline}>
                  <Input id="o-headline" value={d.headline} onChange={(e) => (set("headline", e.target.value), setFieldErrors((f) => ({ ...f, headline: undefined })))} placeholder="Senior Full-Stack Engineer" aria-invalid={!!fieldErrors.headline || undefined} />
                </Field>
                <Field label="Short summary" htmlFor="o-summary" optional className="sm:col-span-2">
                  <Textarea id="o-summary" value={d.summary} onChange={(e) => set("summary", e.target.value)} placeholder="What you do best and what you're looking for next." />
                </Field>
                <div className="sm:col-span-2">
                  <LocationFields
                    idPrefix="o"
                    value={d.location}
                    onChange={(location) => {
                      if (location.country !== d.location.country) setHasRegions(null);
                      set("location", location);
                      setFieldErrors((e) => ({ ...e, country: undefined, region: undefined, city: location.city.trim() ? undefined : e.city }));
                    }}
                    errors={fieldErrors}
                    onRegionAvailability={onRegionAvailability}
                  />
                </div>
                <Field label="Seniority" htmlFor="o-sen">
                  <SenioritySelect id="o-sen" value={d.seniority} onChange={(v) => set("seniority", v)} />
                </Field>
                <Field label="Years of experience" htmlFor="o-years">
                  <Input id="o-years" type="number" min={0} max={60} value={d.yearsExperience} onChange={(e) => set("yearsExperience", Math.max(0, Math.min(60, Number(e.target.value) || 0)))} />
                </Field>
                <div className="sm:col-span-2">
                  <LinkFields value={d.links} onChange={(links) => set("links", links)} errors={serverErrors} />
                </div>
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell title="Where can you work?" body="This is how we keep roles you can't legally take out of your feed — and find employers who sponsor.">
              <div className="space-y-5">
                <Field label="Countries where you're already authorized" htmlFor="o-auth" hint="Citizenship, permanent residency or a current work visa.">
                  <AuthorizationEditor value={d.workAuthorizations} onChange={(v) => set("workAuthorizations", v)} />
                </Field>
                <label className="flex items-center justify-between gap-4 rounded-lg border border-line p-4">
                  <span>
                    <span className="block text-sm font-medium">I&apos;ll need visa sponsorship elsewhere</span>
                    <span className="mt-0.5 block text-xs text-muted">We&apos;ll prioritise employers who sponsor</span>
                  </span>
                  <Switch checked={d.requiresSponsorship} onCheckedChange={(v) => set("requiresSponsorship", v)} aria-label="Requires sponsorship" />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-lg border border-line p-4">
                  <span>
                    <span className="block text-sm font-medium">I&apos;m open to relocating</span>
                    <span className="mt-0.5 block text-xs text-muted">Include on-site and hybrid roles abroad</span>
                  </span>
                  <Switch checked={d.willingToRelocate} onCheckedChange={(v) => set("willingToRelocate", v)} aria-label="Willing to relocate" />
                </label>
                {d.willingToRelocate && (
                  <Field label="Relocation countries" htmlFor="o-reloc" hint="Leave empty to consider anywhere.">
                    <CountryChips label="Relocation countries" value={d.relocationCountries} onChange={(v) => set("relocationCountries", v)} />
                  </Field>
                )}
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell title="What are you looking for?" body="Your preferences shape ranking — not just filtering.">
              <div className="space-y-5">
                <Field label="Roles you want" htmlFor="o-roles" hint="Pick a suggestion or type a job title and press Enter.">
                  <RolesInput id="o-roles" value={d.preferredRoles} onChange={(v) => set("preferredRoles", v)} errors={serverErrors} />
                </Field>
                <Field label="Target countries" htmlFor="o-targets">
                  <CountryChips label="Target countries" value={d.preferredCountries} onChange={(v) => set("preferredCountries", v)} />
                </Field>
                <Field label="Work mode" htmlFor="o-mode">
                  <Segmented label="Work mode" value={d.remotePreference} onChange={(v) => set("remotePreference", v)} options={[{ value: "any", label: "Open to all" }, { value: "remote", label: "Remote" }, { value: "hybrid", label: "Hybrid" }, { value: "onsite", label: "On-site" }]} />
                </Field>
                <Field label="Minimum annual salary" htmlFor="o-salary" optional>
                  <div className="flex max-w-sm gap-2">
                    <CurrencySelect value={d.salaryExpectation?.currency ?? "USD"} onChange={(currency) => set("salaryExpectation", { min: d.salaryExpectation?.min ?? 0, currency })} />
                    <Input id="o-salary" type="number" min={0} step={1000} value={d.salaryExpectation?.min ?? ""} onChange={(e) => set("salaryExpectation", e.target.value ? { min: Number(e.target.value), currency: d.salaryExpectation?.currency ?? "USD" } : null)} />
                  </div>
                </Field>
              </div>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell title="Skills & experience" body="Skills drive a third of every match score. Experience highlights are what tailoring rewrites.">
              <div className="space-y-6">
                <Field label="Skills" htmlFor="o-skills">
                  <SkillsEditor value={d.skills} onChange={(v) => set("skills", v)} errors={serverErrors} />
                </Field>
                <Field label="Most recent role" htmlFor="o-exp" optional>
                  <ExperienceEditor value={d.experience} onChange={(v) => set("experience", v)} errors={serverErrors} />
                </Field>
                <Field label="Education" htmlFor="o-edu" optional>
                  <EducationEditor value={d.education} onChange={(v) => set("education", v)} errors={serverErrors} />
                </Field>
              </div>
            </StepShell>
          )}
      </div>

      {stepError && (
        <div className="mt-6">
          <InlineError title="One more thing" message={stepError} />
        </div>
      )}

      <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
        <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0}>
          <ArrowLeft /> Back
        </Button>
        <div className="flex items-center gap-2">
          {step === 0 && !uploaded && (
            <Button variant="ghost" onClick={() => go(1)}>
              Skip for now
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => go(step + 1)} disabled={upload.pending}>
              Continue <ArrowRight />
            </Button>
          ) : (
            <Button onClick={() => void finish()} loading={complete.pending}>
              Find my matches <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepShell({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="headline text-[36px] sm:text-[44px]">{title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{body}</p>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Finishing({ phase, matches, countries }: { phase: number; matches: number; countries: number }) {
  const lines = ["Reading your profile", `Checking work authorization across ${countries || "your"} target countries`, "Scoring roles on seven factors", matches ? `${matches} roles ranked for you` : "Done"];
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center" role="status" aria-live="polite">
      <div className="relative grid size-16 place-items-center rounded-2xl border border-line-strong bg-surface">
        {phase < 3 ? <Loader2 className="size-6 animate-spin text-accent" /> : <Check className="size-6 text-success" />}
      </div>
      <ul className="mt-10 space-y-3 text-left">
        {lines.map((l, i) => (
          <motion.li key={l} initial={{ opacity: 0, y: 6 }} animate={{ opacity: i <= phase ? 1 : 0.25, y: 0 }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3 text-sm">
            <span className={cn("grid size-5 place-items-center rounded-full border", i < phase || phase === 3 ? "border-success bg-success-soft text-success" : i === phase ? "border-accent" : "border-line-strong")}>
              {(i < phase || phase === 3) && <Check className="size-3" />}
            </span>
            <span className={i <= phase ? "text-fg" : "text-subtle"}>{l}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
