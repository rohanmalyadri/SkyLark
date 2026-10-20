"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { updateProfileAction } from "@/app/actions/candidate";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import type { CandidateProfile } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";
import { AvatarField } from "./avatar-field";
import { textProblem } from "@/lib/validation/text";
import { AuthorizationEditor, CountryChips, CurrencySelect, EducationEditor, ExperienceEditor, LinkFields, LocationFields, RolesInput, Segmented, SenioritySelect, SkillsEditor, cleanDraft, toDraft, type ProfileDraft, type SkillRequestView } from "./fields";

export function ProfileEditor({ profile, fullName, avatarUrl, evidence = [], reviewed = [], skillRequests = [] }: { profile: CandidateProfile; fullName: string; avatarUrl: string | null; evidence?: string[]; reviewed?: string[]; skillRequests?: SkillRequestView[] }) {
  const initial = useMemo(() => toDraft(profile), [profile]);
  const [d, setD] = useState<ProfileDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [headlineTouched, setHeadlineTouched] = useState(false);
  const dirty = JSON.stringify(d) !== JSON.stringify(initial);
  const set = <K extends keyof ProfileDraft>(k: K, v: ProfileDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const save = useAction(updateProfileAction);

  const submit = async () => {
    const clean = cleanDraft(d);
    const res = await save.execute(clean);
    setErrors(!res.ok && res.fieldErrors ? res.fieldErrors : {});
    if (res.ok) setD(clean);
    else if (res.fieldErrors) {
      const top = Object.keys(res.fieldErrors)[0]?.split(".")[0];
      const section = top === "skills" || top === "experience" || top === "education" ? top : top === "preferredRoles" ? "preferences" : "basics";
      document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const err = (k: string) => errors[k]?.[0];
  const headlineProblem = headlineTouched ? textProblem(d.headline, "Headline") : null;

  return (
    <div className="space-y-6">
      <Panel id="basics" className="scroll-mt-20">
        <PanelHeader title="Basics" description="How you introduce yourself to employers" />
        <div className="border-b border-line p-5">
          <AvatarField name={fullName} avatarUrl={avatarUrl} />
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Headline" htmlFor="headline" error={headlineProblem ?? err("headline")} className="sm:col-span-2">
            <Input id="headline" value={d.headline} onChange={(e) => set("headline", e.target.value)} onBlur={() => setHeadlineTouched(true)} placeholder="Senior Full-Stack Engineer" maxLength={140} aria-invalid={!!(headlineProblem ?? err("headline")) || undefined} />
          </Field>
          <Field label="Summary" htmlFor="summary" hint={`${d.summary.length}/2000`} error={err("summary")} className="sm:col-span-2">
            <Textarea id="summary" value={d.summary} onChange={(e) => set("summary", e.target.value)} maxLength={2000} className="min-h-28" />
          </Field>
          <div className="sm:col-span-2">
            <LocationFields idPrefix="p" value={d.location} onChange={(location) => set("location", location)} errors={{ country: err("location.country"), region: err("location.region"), city: err("location.city") }} />
          </div>
          <Field label="Seniority" htmlFor="seniority">
            <SenioritySelect id="seniority" value={d.seniority} onChange={(v) => set("seniority", v)} />
          </Field>
          <Field label="Years of experience" htmlFor="years" error={err("yearsExperience")}>
            <Input id="years" type="number" min={0} max={60} value={d.yearsExperience} onChange={(e) => set("yearsExperience", Math.max(0, Number(e.target.value)))} />
          </Field>
          <div className="sm:col-span-2">
            <LinkFields value={d.links} onChange={(links) => set("links", links)} errors={errors} />
          </div>
        </div>
      </Panel>

      <Panel id="eligibility" className="scroll-mt-20">
        <PanelHeader title="Work authorization" description="The single most important input for international matching" />
        <div className="space-y-5 p-5">
          <Field label="Where you can work today" htmlFor="auth">
            <AuthorizationEditor value={d.workAuthorizations} onChange={(v) => set("workAuthorizations", v)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-start justify-between gap-4 rounded-lg border border-line p-4">
              <span>
                <span className="block text-[13px] font-medium">I need visa sponsorship</span>
                <span className="mt-0.5 block text-xs text-muted">For roles outside the countries above</span>
              </span>
              <Switch checked={d.requiresSponsorship} onCheckedChange={(v) => set("requiresSponsorship", v)} aria-label="Requires sponsorship" />
            </label>
            <label className="flex items-start justify-between gap-4 rounded-lg border border-line p-4">
              <span>
                <span className="block text-[13px] font-medium">Open to relocating</span>
                <span className="mt-0.5 block text-xs text-muted">We&apos;ll include on-site roles abroad</span>
              </span>
              <Switch checked={d.willingToRelocate} onCheckedChange={(v) => set("willingToRelocate", v)} aria-label="Willing to relocate" />
            </label>
          </div>
          {d.willingToRelocate && (
            <Field label="Relocation countries" htmlFor="reloc" hint="Leave empty if you'd relocate anywhere.">
              <CountryChips label="Relocation countries" value={d.relocationCountries} onChange={(v) => set("relocationCountries", v)} />
            </Field>
          )}
        </div>
      </Panel>

      <Panel id="preferences" className="scroll-mt-20">
        <PanelHeader title="Job preferences" />
        <div className="space-y-5 p-5">
          <Field label="Preferred roles" htmlFor="roles" hint="Pick a suggestion or type a job title and press Enter." error={err("preferredRoles")}>
            <RolesInput id="roles" value={d.preferredRoles} onChange={(v) => set("preferredRoles", v)} errors={errors} />
          </Field>
          <Field label="Target countries" htmlFor="targets">
            <CountryChips label="Target countries" value={d.preferredCountries} onChange={(v) => set("preferredCountries", v)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Work mode" htmlFor="mode">
              <Segmented label="Work mode" value={d.remotePreference} onChange={(v) => set("remotePreference", v)} options={[{ value: "any", label: "Any" }, { value: "remote", label: "Remote" }, { value: "hybrid", label: "Hybrid" }, { value: "onsite", label: "On-site" }]} />
            </Field>
            <Field label="Minimum salary (annual)" htmlFor="salary" optional>
              <div className="flex gap-2">
                <CurrencySelect value={d.salaryExpectation?.currency ?? "USD"} onChange={(currency) => set("salaryExpectation", { min: d.salaryExpectation?.min ?? 0, currency })} />
                <Input id="salary" type="number" min={0} step={1000} value={d.salaryExpectation?.min ?? ""} onChange={(e) => set("salaryExpectation", e.target.value ? { min: Number(e.target.value), currency: d.salaryExpectation?.currency ?? "USD" } : null)} placeholder="80000" />
              </div>
            </Field>
          </div>
        </div>
      </Panel>

      <Panel id="skills" className="scroll-mt-20">
        <PanelHeader title="Skills" description="Search recognised skills, then set proficiency (1–5) and years. Skills drive 30% of every match score." />
        <div className="p-5">
          <SkillsEditor value={d.skills} onChange={(v) => set("skills", v)} errors={errors} evidence={evidence} reviewed={reviewed} requests={skillRequests} />
        </div>
      </Panel>

      <Panel id="experience" className="scroll-mt-20">
        <PanelHeader title="Experience" description="Highlights are what tailoring rewrites — be specific." />
        <div className="p-5">
          <ExperienceEditor value={d.experience} onChange={(v) => set("experience", v)} errors={errors} />
        </div>
      </Panel>

      <Panel id="education" className="scroll-mt-20">
        <PanelHeader title="Education" description="Matched against degree requirements stated in listings." />
        <div className="p-5">
          <EducationEditor value={d.education} onChange={(v) => set("education", v)} errors={errors} />
        </div>
      </Panel>

      <AnimatePresence>
        {dirty && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ duration: 0.25 }} className="fixed inset-x-3 bottom-20 z-40 md:bottom-6 md:left-[calc(232px+2rem)] md:right-8">
            <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 rounded-lg border border-line-strong bg-surface-2 px-4 py-3 shadow-[0_20px_60px_rgb(0_0_0/0.12)]">
              <p className="text-[13px] text-muted">
                <span className="mr-2 inline-block size-1.5 rounded-full bg-warning align-middle" aria-hidden />
                Unsaved changes {Object.keys(errors).length > 0 && <span className="text-danger">· fix highlighted fields</span>}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => (setD(initial), setErrors({}))}>
                  Discard
                </Button>
                <Button size="sm" loading={save.pending} onClick={() => void submit()}>
                  Save profile
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
