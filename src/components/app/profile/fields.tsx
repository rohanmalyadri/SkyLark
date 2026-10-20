"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { SuggestInput } from "@/components/ui/suggest-input";
import { AUTH_STATUS_LABEL, COUNTRIES, countryName, SENIORITY_LABEL } from "@/lib/domain/constants";
import { useCities, useCountries, useRegions } from "@/lib/hooks/use-geo";
import { requestSkillAction } from "@/app/actions/candidate";
import { DEGREE_LEVELS, type AuthStatus, type CandidateProfile, type Education, type Experience, type Skill, type SkillRequest } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";
import { checkGithub, checkLinkedin, checkPortfolio } from "@/lib/validation/links";
import { looksLikeGibberish, textProblem } from "@/lib/validation/text";
import { cn } from "@/lib/utils";

export type ProfileDraft = Omit<CandidateProfile, "userId" | "updatedAt">;
/** Server field errors keyed by path ("skills.2.name", "experience.0.title", "location.city"). */
export type FieldErrors = Record<string, string[] | undefined>;

export function toDraft(p: CandidateProfile): ProfileDraft {
  const { userId: _u, updatedAt: _t, ...rest } = p;
  void _u;
  void _t;
  return rest;
}

const countryEntries = Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1]));
const first = (errors: FieldErrors | undefined, key: string) => errors?.[key]?.[0];

/** Inline check while typing: the same plausibility rule the server applies. */
function useBlurCheck(value: string, what: string) {
  const [touched, setTouched] = useState(false);
  const problem = touched ? textProblem(value, what) : null;
  return { problem, onBlur: () => setTouched(true) };
}

export function CountrySelect({ id, value, onChange, placeholder = "Select a country", invalid }: { id?: string; value: string; onChange: (v: string) => void; placeholder?: string; invalid?: boolean }) {
  const { data, loading, error, retry } = useCountries();
  const options = useMemo(() => (data ?? []).map((c) => ({ value: c.code, label: c.name })), [data]);
  return (
    <Combobox
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      loading={loading}
      error={error}
      onRetry={retry}
      placeholder={placeholder}
      searchPlaceholder="Search countries"
      emptyText="No country matches"
      aria-label="Country"
      aria-invalid={invalid}
    />
  );
}

/** States, provinces or regions, fetched for the chosen country. */
export function RegionSelect({ id, country, value, onChange, invalid, onAvailability }: { id?: string; country: string; value: string; onChange: (v: string) => void; invalid?: boolean; onAvailability?: (hasRegions: boolean) => void }) {
  const { data, loading, error, retry } = useRegions(country);
  const options = useMemo(() => (data ?? []).map((r) => ({ value: r.name, label: r.name })), [data]);
  const hasRegions = !!data && data.length > 0;
  useEffect(() => {
    if (data) onAvailability?.(data.length > 0);
  }, [data, onAvailability]);

  if (country && data && !hasRegions) {
    return <div className="flex h-9 items-center rounded-md border border-dashed border-line-strong px-3 text-[13px] text-subtle">No states or regions for this country</div>;
  }
  return (
    <Combobox
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      loading={!!country && loading}
      error={error}
      onRetry={retry}
      disabled={!country}
      placeholder={country ? "Select a state or region" : "Choose a country first"}
      searchPlaceholder="Search states and regions"
      emptyText="No state matches"
      aria-label="State or region"
      aria-invalid={invalid}
    />
  );
}

/** Searchable city list for the chosen country and region (GeoNames data). Falls back to typing when the dataset lists none. */
export function CitySelect({ id, country, region, regionsKnown, value, onChange, invalid }: { id?: string; country: string; region: string; regionsKnown: boolean | null; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const ready = !!country && (region !== "" || regionsKnown === false);
  const { data, loading, error, retry } = useCities(ready ? country : "", region);
  const options = useMemo(() => {
    const list = (data ?? []).map((c) => ({ value: c.name, label: c.name }));
    // Keep a previously saved value selectable even if the dataset spells it differently.
    if (value && !list.some((o) => o.value === value)) list.unshift({ value, label: value });
    return list;
  }, [data, value]);

  if (ready && data && data.length === 0) {
    return <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="address-level2" placeholder="Type your city" aria-invalid={invalid || undefined} />;
  }
  return (
    <Combobox
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      loading={ready && loading}
      error={error}
      onRetry={retry}
      disabled={!ready}
      placeholder={!country ? "Choose a country first" : !ready ? "Choose a state or region first" : "Select a city"}
      searchPlaceholder="Search cities"
      emptyText="No city matches — check the spelling or pick the nearest city"
      aria-label="City"
      aria-invalid={invalid}
    />
  );
}

/** Country → state/region → city, in that order. Changing the country or region clears what depends on it. */
export function LocationFields({
  idPrefix,
  value,
  onChange,
  errors,
  onRegionAvailability,
}: {
  idPrefix: string;
  value: ProfileDraft["location"];
  onChange: (v: ProfileDraft["location"]) => void;
  errors?: { country?: string; region?: string; city?: string };
  onRegionAvailability?: (hasRegions: boolean) => void;
}) {
  const [regionsKnown, setRegionsKnown] = useState<boolean | null>(null);
  const handleAvailability = useCallback(
    (v: boolean) => {
      setRegionsKnown(v);
      onRegionAvailability?.(v);
    },
    [onRegionAvailability],
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Country" htmlFor={`${idPrefix}-country`} error={errors?.country}>
        <CountrySelect
          id={`${idPrefix}-country`}
          value={value.country}
          invalid={!!errors?.country}
          onChange={(country) => {
            if (country === value.country) return;
            setRegionsKnown(null);
            onChange({ country, region: "", city: "" });
          }}
        />
      </Field>
      <Field label="State / region" htmlFor={`${idPrefix}-region`} error={errors?.region}>
        <RegionSelect id={`${idPrefix}-region`} country={value.country} value={value.region} invalid={!!errors?.region} onChange={(region) => onChange({ ...value, region, city: region === value.region ? value.city : "" })} onAvailability={handleAvailability} />
      </Field>
      <Field label="City" htmlFor={`${idPrefix}-city`} error={errors?.city} className="sm:col-span-2">
        <CitySelect id={`${idPrefix}-city`} country={value.country} region={value.region} regionsKnown={regionsKnown} value={value.city} invalid={!!errors?.city} onChange={(city) => onChange({ ...value, city })} />
      </Field>
    </div>
  );
}

/** Toggle chips for picking several countries. Buttons with aria-pressed, keyboard friendly. */
export function CountryChips({ value, onChange, label }: { value: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {countryEntries.map(([code, name]) => {
        const on = value.includes(code);
        return (
          <button
            key={code}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((c) => c !== code) : [...value, code])}
            className={cn("h-7 rounded-md border px-2.5 text-xs transition-colors", on ? "border-accent-line bg-accent-soft text-accent" : "border-line text-muted hover:border-line-strong hover:text-fg")}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

function Chips({ value, onRemove, errorIndex }: { value: string[]; onRemove: (v: string) => void; errorIndex?: Set<number> }) {
  if (value.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {value.map((v, i) => (
        <span key={v} className={cn("inline-flex h-7 items-center gap-1 rounded-md border pl-2.5 pr-1 text-xs", errorIndex?.has(i) ? "border-danger/50 bg-danger-soft text-danger" : "border-line bg-surface-2 text-fg")}>
          {v}
          <button type="button" onClick={() => onRemove(v)} className="grid size-5 place-items-center rounded text-subtle hover:text-fg" aria-label={`Remove ${v}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

const skillCheck = (t: string) => (looksLikeGibberish(t) ? `“${t}” isn't a recognised skill` : null);
const roleCheck = (t: string) => textProblem(t, "Role") ?? (t.trim().length < 2 ? "Enter a role" : null);

/** Preferred roles: ESCO occupation suggestions, or a typed title that reads as real words. */
export function RolesInput({ id, value, onChange, errors, max = 8 }: { id?: string; value: string[]; onChange: (v: string[]) => void; errors?: FieldErrors; max?: number }) {
  const bad = new Set(value.map((_, i) => i).filter((i) => first(errors, `preferredRoles.${i}`)));
  const firstBad = [...bad].map((i) => first(errors, `preferredRoles.${i}`))[0];
  return (
    <div className="space-y-2">
      <SuggestInput id={id} endpoint="/api/roles/suggest" requirePick={false} validate={roleCheck} noun="role" onPick={(v) => value.length < max && onChange([...value, v])} exclude={value} disabled={value.length >= max} placeholder={value.length >= max ? `Up to ${max} roles` : "e.g. Software Engineer"} aria-label="Preferred role" />
      <Chips value={value} onRemove={(v) => onChange(value.filter((x) => x !== v))} errorIndex={bad} />
      {firstBad && <p className="text-xs text-danger">{firstBad}</p>}
    </div>
  );
}

/** Skill tags (e.g. "skills used" on a role): only recognised skills can be added. */
export function SkillTags({ id, value, onChange, max = 20, error }: { id?: string; value: string[]; onChange: (v: string[]) => void; max?: number; error?: string }) {
  return (
    <div className="space-y-2">
      <SuggestInput id={id} endpoint="/api/skills/suggest" validate={skillCheck} noun="skill" onPick={(v) => value.length < max && onChange([...value, v])} exclude={value} disabled={value.length >= max} placeholder="Search skills" aria-label="Skill used" />
      <Chips value={value} onRemove={(v) => onChange(value.filter((x) => x !== v))} />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-md border border-line-strong bg-surface p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} className={cn("h-8 rounded px-3 text-[13px] transition-colors", value === o.value ? "bg-surface-3 text-fg" : "text-muted hover:text-fg")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export type SkillRequestView = Pick<SkillRequest, "id" | "name" | "status" | "note">;

/**
 * Skills come only from recognised vocabularies (curated taxonomy, Stack Overflow tags, ESCO);
 * anything else can be sent to a reviewer. Each skill shows where its standing comes from:
 * self-reported, seen in public GitHub repositories (evidence only), or approved by a reviewer.
 */
export function SkillsEditor({ value, onChange, errors, evidence = [], reviewed = [], requests: initialRequests = [] }: { value: Skill[]; onChange: (v: Skill[]) => void; errors?: FieldErrors; evidence?: string[]; reviewed?: string[]; requests?: SkillRequestView[] }) {
  const update = (i: number, patch: Partial<Skill>) => onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const [requests, setRequests] = useState(initialRequests);
  const request = useAction(requestSkillAction);
  const onRequest = async (name: string) => {
    const res = await request.execute(name, "");
    if (res.ok) setRequests((r) => (r.some((x) => x.id === res.data.id) ? r : [{ id: res.data.id, name: res.data.name, status: res.data.status, note: "" }, ...r]));
    return res.ok;
  };
  const evidenceSet = new Set(evidence);
  const reviewedSet = new Set(reviewed);
  const visibleRequests = requests.filter((r) => r.status !== "approved" || !value.some((s) => s.name.toLowerCase() === r.name.toLowerCase()));

  return (
    <div className="space-y-3">
      <SuggestInput
        endpoint="/api/skills/suggest"
        validate={skillCheck}
        noun="skill"
        onPick={(name) => value.length < 40 && onChange([...value, { name, level: 3, years: 1 }])}
        onRequest={onRequest}
        exclude={value.map((s) => s.name)}
        disabled={value.length >= 40}
        placeholder="Search skills, e.g. PostgreSQL, Figma, Accounting"
        aria-label="New skill"
      />
      {value.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line">
          {value.map((s, i) => {
            const err = first(errors, `skills.${i}.name`) ?? first(errors, `skills.${i}.years`);
            return (
              <li key={s.name} className={cn("px-3 py-2", err && "bg-danger-soft/40")}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex min-w-28 flex-1 flex-wrap items-center gap-1.5 text-[13px] text-fg">
                    {s.name}
                    {reviewedSet.has(s.name) ? (
                      <span className="rounded-sm border border-success/25 bg-success-soft px-1.5 text-[10px] font-medium text-success" title="Present when a reviewer approved your profile">Reviewer-approved</span>
                    ) : (
                      <span className="rounded-sm border border-line px-1.5 text-[10px] text-subtle" title="Added by you and not yet reviewed">Self-reported</span>
                    )}
                    {evidenceSet.has(s.name) && (
                      <span className="rounded-sm border border-line px-1.5 text-[10px] text-muted" title="Seen in your public GitHub repositories. Supporting evidence only, not a verified credential.">
                        In GitHub repos
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1" role="radiogroup" aria-label={`${s.name} proficiency`}>
                    {[1, 2, 3, 4, 5].map((l) => (
                      <button key={l} type="button" role="radio" aria-checked={s.level === l} aria-label={`Level ${l}`} onClick={() => update(i, { level: l as Skill["level"] })} className="grid size-5 place-items-center">
                        <span className={cn("block h-2.5 w-1.5 rounded-sm transition-colors", l <= s.level ? "bg-accent" : "bg-black/10")} />
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-subtle">
                    <input type="number" min={0} max={50} value={s.years} onChange={(e) => update(i, { years: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })} className="h-7 w-12 rounded border border-line-strong bg-surface-2 px-1.5 text-center text-xs text-fg tabular focus:border-accent focus:outline-none" aria-label={`${s.name} years`} />
                    yrs
                  </label>
                  <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid size-7 place-items-center rounded text-subtle hover:bg-surface-2 hover:text-danger" aria-label={`Remove ${s.name}`}>
                    <X className="size-3.5" />
                  </button>
                </div>
                {err && (
                  <p role="alert" className="mt-1 text-xs text-danger">
                    {err}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {visibleRequests.length > 0 && (
        <div className="rounded-md border border-dashed border-line-strong p-3">
          <p className="text-xs font-medium text-fg">Skills sent for review</p>
          <ul className="mt-2 space-y-1.5">
            {visibleRequests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="text-fg">{r.name}</span>
                <span className={cn("rounded-sm border px-1.5 text-[10px] font-medium", r.status === "pending" ? "border-warning/30 text-warning" : r.status === "approved" ? "border-success/25 text-success" : "border-danger/30 text-danger")}>
                  {r.status === "pending" ? "Awaiting review" : r.status === "approved" ? "Approved: add it from the search" : "Not added"}
                </span>
                {r.note && <span className="text-xs text-subtle">{r.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function AuthorizationEditor({ value, onChange }: { value: CandidateProfile["workAuthorizations"]; onChange: (v: CandidateProfile["workAuthorizations"]) => void }) {
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState<AuthStatus>("citizen");
  const id = useId();
  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line">
          {value.map((a) => (
            <li key={a.country} className="flex items-center gap-3 px-3 py-2 text-[13px]">
              <span className="flex-1 text-fg">{countryName(a.country)}</span>
              <span className="text-muted">{AUTH_STATUS_LABEL[a.status]}</span>
              <button type="button" onClick={() => onChange(value.filter((x) => x.country !== a.country))} className="grid size-7 place-items-center rounded text-subtle hover:bg-surface-2 hover:text-danger" aria-label={`Remove ${a.country}`}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <CountrySelect id={`${id}-c`} value={country} onChange={setCountry} />
        <SelectMenu
          aria-label="Authorization status"
          value={status}
          onValueChange={(v) => setStatus(v as AuthStatus)}
          options={Object.entries(AUTH_STATUS_LABEL)
            .filter(([k]) => k !== "none")
            .map(([k, v]) => ({ value: k, label: v }))}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!country}
          onClick={() => {
            onChange([...value.filter((a) => a.country !== country), { country, status }]);
            setCountry("");
          }}
        >
          <Plus /> Add
        </Button>
      </div>
    </div>
  );
}

const thisMonth = () => new Date().toISOString().slice(0, 7);

/** Client mirror of the server's date rules, so mistakes show before saving. */
function experienceDateError(e: Experience): { start?: string; end?: string } {
  const now = thisMonth();
  const out: { start?: string; end?: string } = {};
  if (!e.startDate) out.start = "Choose a start month";
  else if (e.startDate > now) out.start = "Start date can't be in the future";
  else if (e.startDate < "1950-01") out.start = "Check the start date";
  if (e.endDate && e.endDate > now) out.end = "End date can't be in the future — mark the role as current instead";
  else if (e.endDate && e.startDate && e.endDate < e.startDate) out.end = "End date must be after the start date";
  return out;
}

function ExperienceItem({ e, i, update, remove, errors }: { e: Experience; i: number; update: (patch: Partial<Experience>) => void; remove: () => void; errors?: FieldErrors }) {
  const title = useBlurCheck(e.title, "Job title");
  const company = useBlurCheck(e.company, "Company");
  const dates = experienceDateError(e);
  const err = (k: string) => first(errors, `experience.${i}.${k}`);
  return (
    <fieldset className="rounded-lg border border-line p-4">
      <legend className="sr-only">Role {i + 1}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" htmlFor={`${e.id}-title`} error={title.problem ?? err("title")}>
          <Input id={`${e.id}-title`} value={e.title} maxLength={80} onChange={(ev) => update({ title: ev.target.value })} onBlur={title.onBlur} aria-invalid={!!(title.problem ?? err("title")) || undefined} />
        </Field>
        <Field label="Company" htmlFor={`${e.id}-co`} error={company.problem ?? err("company")}>
          <Input id={`${e.id}-co`} value={e.company} maxLength={80} onChange={(ev) => update({ company: ev.target.value })} onBlur={company.onBlur} aria-invalid={!!(company.problem ?? err("company")) || undefined} />
        </Field>
        <Field label="Start" htmlFor={`${e.id}-start`} error={(e.startDate && dates.start) || err("startDate")}>
          <Input id={`${e.id}-start`} type="month" max={thisMonth()} min="1950-01" value={e.startDate} onChange={(ev) => update({ startDate: ev.target.value })} aria-invalid={!!((e.startDate && dates.start) || err("startDate")) || undefined} />
        </Field>
        <Field label="End" htmlFor={`${e.id}-end`} hint={e.endDate ? undefined : "Current role"} error={dates.end ?? err("endDate")}>
          <div className="flex gap-2">
            <Input id={`${e.id}-end`} type="month" max={thisMonth()} min={e.startDate || "1950-01"} value={e.endDate ?? ""} onChange={(ev) => update({ endDate: ev.target.value || null })} aria-invalid={!!(dates.end ?? err("endDate")) || undefined} />
            <Button type="button" variant={e.endDate ? "outline" : "secondary"} onClick={() => update({ endDate: e.endDate ? null : thisMonth() })} className="shrink-0">
              {e.endDate ? "Current" : "Ended"}
            </Button>
          </div>
        </Field>
      </div>
      <Field label="Highlights" htmlFor={`${e.id}-hl`} hint="One achievement per line. These feed tailoring." error={first(errors, `experience.${i}.highlights.0`)} className="mt-3">
        <Textarea id={`${e.id}-hl`} value={e.highlights.join("\n")} onChange={(ev) => update({ highlights: ev.target.value.split("\n").slice(0, 8) })} onBlur={() => update({ highlights: e.highlights.map((h) => h.trim()).filter(Boolean) })} className="min-h-24 text-[13px]" />
      </Field>
      <Field label="Skills used" htmlFor={`${e.id}-sk`} className="mt-3">
        <SkillTags id={`${e.id}-sk`} value={e.skills} onChange={(skills) => update({ skills })} error={err("skills")} />
      </Field>
      <div className="mt-3 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={remove} className="text-danger hover:text-danger">
          <Trash2 /> Remove role
        </Button>
      </div>
    </fieldset>
  );
}

export function ExperienceEditor({ value, onChange, errors }: { value: Experience[]; onChange: (v: Experience[]) => void; errors?: FieldErrors }) {
  return (
    <div className="space-y-3">
      {value.map((e, i) => (
        <ExperienceItem key={e.id} e={e} i={i} errors={errors} update={(patch) => onChange(value.map((x, j) => (j === i ? { ...x, ...patch } : x)))} remove={() => onChange(value.filter((_, j) => j !== i))} />
      ))}
      <Button type="button" variant="secondary" onClick={() => onChange([...value, { id: crypto.randomUUID(), company: "", title: "", startDate: "", endDate: null, description: "", highlights: [], skills: [] }])}>
        <Plus /> Add role
      </Button>
    </div>
  );
}

function EducationItem({ e, i, update, remove, errors }: { e: Education; i: number; update: (patch: Partial<Education>) => void; remove: () => void; errors?: FieldErrors }) {
  const school = useBlurCheck(e.school, "School");
  const field = useBlurCheck(e.field, "Field of study");
  const err = (k: string) => first(errors, `education.${i}.${k}`);
  const maxYear = new Date().getFullYear() + 7;
  const yearError = e.year && (e.year < 1950 || e.year > maxYear) ? `Use a year between 1950 and ${maxYear}` : undefined;
  return (
    <fieldset className="grid gap-3 rounded-lg border border-line p-4 sm:grid-cols-2">
      <legend className="sr-only">Education {i + 1}</legend>
      <Field label="School or university" htmlFor={`${e.id}-school`} error={school.problem ?? err("school")} className="sm:col-span-2">
        <Input id={`${e.id}-school`} value={e.school} maxLength={120} onChange={(ev) => update({ school: ev.target.value })} onBlur={school.onBlur} aria-invalid={!!(school.problem ?? err("school")) || undefined} />
      </Field>
      <Field label="Qualification" htmlFor={`${e.id}-degree`} error={err("degree")}>
        <SelectMenu id={`${e.id}-degree`} value={e.degree} onValueChange={(v) => update({ degree: v as Education["degree"] })} options={DEGREE_LEVELS.map((d) => ({ value: d, label: d }))} />
      </Field>
      <Field label="Field of study" htmlFor={`${e.id}-field`} error={field.problem ?? err("field")}>
        <Input id={`${e.id}-field`} value={e.field} maxLength={80} onChange={(ev) => update({ field: ev.target.value })} onBlur={field.onBlur} placeholder="e.g. Computer Science" aria-invalid={!!(field.problem ?? err("field")) || undefined} />
      </Field>
      <Field label="Graduation year" htmlFor={`${e.id}-year`} hint="Expected year if you're still studying." error={yearError ?? err("year")}>
        <Input id={`${e.id}-year`} type="number" min={1950} max={maxYear} value={e.year || ""} onChange={(ev) => update({ year: Number(ev.target.value) || 0 })} aria-invalid={!!(yearError ?? err("year")) || undefined} />
      </Field>
      <div className="flex items-end justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={remove} className="text-danger hover:text-danger">
          <Trash2 /> Remove
        </Button>
      </div>
    </fieldset>
  );
}

export function EducationEditor({ value, onChange, errors }: { value: Education[]; onChange: (v: Education[]) => void; errors?: FieldErrors }) {
  return (
    <div className="space-y-3">
      {value.map((e, i) => (
        <EducationItem key={e.id} e={e} i={i} errors={errors} update={(patch) => onChange(value.map((x, j) => (j === i ? { ...x, ...patch } : x)))} remove={() => onChange(value.filter((_, j) => j !== i))} />
      ))}
      {value.length < 6 && (
        <Button type="button" variant="secondary" onClick={() => onChange([...value, { id: crypto.randomUUID(), school: "", degree: "Bachelor's", field: "", year: new Date().getFullYear() }])}>
          <Plus /> Add education
        </Button>
      )}
    </div>
  );
}

/** GitHub (confirmed through the GitHub API on save), LinkedIn (self-reported) and a portfolio site. */
export function LinkFields({ value, onChange, errors }: { value: ProfileDraft["links"]; onChange: (v: ProfileDraft["links"]) => void; errors?: FieldErrors }) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const local = (k: "github" | "linkedin" | "portfolio") => {
    if (!touched[k] || !value[k]) return undefined;
    const res = (k === "github" ? checkGithub : k === "linkedin" ? checkLinkedin : checkPortfolio)(value[k]!);
    return res.ok ? undefined : res.error;
  };
  const err = (k: "github" | "linkedin" | "portfolio") => local(k) ?? first(errors, `links.${k}`);
  const blur = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="GitHub" htmlFor="link-github" optional hint="We confirm the account and read public repositories through GitHub's API." error={err("github")}>
        <Input id="link-github" value={value.github ?? ""} onChange={(e) => onChange({ ...value, github: e.target.value })} onBlur={() => blur("github")} placeholder="https://github.com/username" autoComplete="url" aria-invalid={!!err("github") || undefined} />
      </Field>
      <Field label="LinkedIn" htmlFor="link-linkedin" optional hint="Shown to reviewers as self-reported; LinkedIn has no public API." error={err("linkedin")}>
        <Input id="link-linkedin" value={value.linkedin ?? ""} onChange={(e) => onChange({ ...value, linkedin: e.target.value })} onBlur={() => blur("linkedin")} placeholder="https://www.linkedin.com/in/your-name" autoComplete="url" aria-invalid={!!err("linkedin") || undefined} />
      </Field>
      <Field label="Portfolio or website" htmlFor="link-portfolio" optional error={err("portfolio")} className="sm:col-span-2">
        <Input id="link-portfolio" value={value.portfolio ?? ""} onChange={(e) => onChange({ ...value, portfolio: e.target.value })} onBlur={() => blur("portfolio")} placeholder="https://yourname.com" autoComplete="url" aria-invalid={!!err("portfolio") || undefined} />
      </Field>
    </div>
  );
}

export function SenioritySelect({ id, value, onChange }: { id?: string; value: CandidateProfile["seniority"]; onChange: (v: CandidateProfile["seniority"]) => void }) {
  return <SelectMenu id={id} value={value} onValueChange={(v) => onChange(v as CandidateProfile["seniority"])} options={Object.entries(SENIORITY_LABEL).map(([k, v]) => ({ value: k, label: v }))} />;
}

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "SGD", "CHF", "AED", "INR"];

export function CurrencySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <SelectMenu aria-label="Currency" className="w-24" value={value} onValueChange={onChange} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />;
}

/** Strip empty optional values so the server schema sees clean input. */
export function cleanDraft(d: ProfileDraft): ProfileDraft {
  return {
    ...d,
    headline: d.headline.trim(),
    experience: d.experience.filter((e) => e.company.trim() || e.title.trim()).map((e) => ({ ...e, title: e.title.trim(), company: e.company.trim(), highlights: e.highlights.map((h) => h.trim()).filter(Boolean) })),
    education: d.education.filter((e) => e.school.trim() || e.field.trim()).map((e) => ({ ...e, school: e.school.trim(), field: e.field.trim() })),
    links: Object.fromEntries(Object.entries(d.links).filter(([, v]) => v && v.trim()).map(([k, v]) => [k, v!.trim()])),
  };
}
