"use client";

import { ArrowRight, ArrowUp, FileCheck2, ListChecks, Loader2, Paperclip, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { completeOnboardingAction, intakeChatAction, uploadResumeAction } from "@/app/actions/candidate";
import { cleanDraft, type ProfileDraft } from "@/components/app/profile/fields";
import { Button } from "@/components/ui/button";
import { SkylarkMark } from "@/components/ui/marks";
import { AUTH_STATUS_LABEL, SENIORITY_LABEL, countryName } from "@/lib/domain/constants";
import { TOPIC_QUESTION, intakeProgress, pendingTopics, type IntakeTopic } from "@/lib/domain/intake";
import { useAction } from "@/lib/hooks/use-action";
import { cn } from "@/lib/utils";
import { Finishing } from "./wizard";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  saved?: string[];
  tone?: "error";
}

interface ChatState {
  draft: ProfileDraft;
  asked: IntakeTopic[];
  messages: ChatMessage[];
}

const newId = () => crypto.randomUUID();

function openingState(initial: ProfileDraft, firstName: string, hasResume: boolean): ChatState {
  // A fresh profile defaults sponsorship and relocation to "yes" for the form's switches. In the
  // chat those must come from the candidate's own answers, so start them off.
  const pristine = initial.workAuthorizations.length === 0 && initial.preferredRoles.length === 0 && initial.preferredCountries.length === 0;
  const draft = pristine ? { ...initial, requiresSponsorship: false, willingToRelocate: false } : initial;
  const first = pendingTopics(draft, [])[0] ?? "headline";
  const intro = hasResume
    ? `Hi ${firstName || "there"}! I've read your resume and filled in what I could. I'll ask a few quick questions to finish your profile. Answer in your own words; you can give several details at once.`
    : `Hi ${firstName || "there"}! I'll ask a few quick questions to set up your profile. Answer in your own words; you can give several details at once. If you have a resume, attach it with the paperclip and I'll skip what it already covers.`;
  return {
    draft,
    asked: [first],
    messages: [
      { id: newId(), role: "assistant", text: intro },
      { id: newId(), role: "assistant", text: TOPIC_QUESTION[first] },
    ],
  };
}

export function ChatIntake({
  userId,
  initialDraft,
  firstName,
  hasResume,
  onSwitchToForm,
}: {
  userId: string;
  initialDraft: ProfileDraft;
  firstName: string;
  hasResume: boolean;
  onSwitchToForm: (draft: ProfileDraft) => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<ChatState>(() => openingState(initialDraft, firstName, hasResume));
  const restored = useRef(false);
  const STORAGE_KEY = `skylark.onboarding.chat.v1:${userId}`;
  const [input, setInput] = useState("");
  const [finishing, setFinishing] = useState<{ phase: number; matches: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const turn = useAction(intakeChatAction, { successToast: false, errorToast: false });
  const upload = useAction(uploadResumeAction, { successToast: false });
  const complete = useAction(completeOnboardingAction, { successToast: false, errorToast: false });

  const { draft, asked, messages } = state;
  const progress = intakeProgress(draft, asked);
  const pending = pendingTopics(draft, asked);
  const ready = pending.length === 0;
  const busy = turn.pending || upload.pending || complete.pending;

  // Resume a conversation interrupted by a reload (same tab only). Read after mount to keep hydration stable.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from storage
      if (saved) setState(JSON.parse(saved) as ChatState);
    } catch {
      /* storage unavailable: start fresh */
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, STORAGE_KEY]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, turn.pending, ready]);

  const push = (...m: ChatMessage[]) => setState((s) => ({ ...s, messages: [...s.messages, ...m] }));

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const userMsg: ChatMessage = { id: newId(), role: "user", text };
    setInput("");
    setState((s) => ({ ...s, messages: [...s.messages, userMsg] }));
    const history = messages.filter((m) => m.tone !== "error").map(({ role, text }) => ({ role, text }));
    const res = await turn.execute({ draft, asked, history, message: text });
    if (!res.ok) {
      setInput(text);
      setState((s) => ({ ...s, messages: [...s.messages.filter((m) => m.id !== userMsg.id), { id: newId(), role: "assistant", tone: "error", text: res.fieldErrors?.message?.[0] ?? res.error }] }));
      return;
    }
    const r = res.data;
    setState((s) => ({
      draft: r.draft as ProfileDraft,
      asked: r.asked,
      messages: [...s.messages.map((m) => (m.id === userMsg.id ? { ...m, saved: r.saved } : m)), { id: newId(), role: "assistant", text: r.reply }],
    }));
    inputRef.current?.focus();
  };

  const onFile = async (f: File) => {
    const fd = new FormData();
    fd.set("file", f);
    push({ id: newId(), role: "user", text: `Attached ${f.name}` });
    const res = await upload.execute(fd);
    if (!res.ok) return push({ id: newId(), role: "assistant", tone: "error", text: res.error });
    const ex = res.data.extracted;
    setState((s) => {
      const d = ex
        ? {
            ...s.draft,
            headline: s.draft.headline || ex.headline || "",
            yearsExperience: s.draft.yearsExperience || ex.yearsExperience || 0,
            skills: s.draft.skills.length ? s.draft.skills : ex.skills,
          }
        : s.draft;
      const next = pendingTopics(d, s.asked)[0];
      const filled = ex ? [ex.headline && "your headline", ex.skills.length && `${ex.skills.length} skills`, ex.yearsExperience && "your years of experience"].filter(Boolean) : [];
      const text = filled.length ? `Thanks, I picked up ${filled.join(", ")} from your resume.` : "Thanks, your resume is saved. I couldn't pick out much from it, so let's keep going.";
      return {
        draft: d,
        asked: next && !s.asked.includes(next) ? [...s.asked, next] : s.asked,
        messages: [...s.messages, { id: newId(), role: "assistant", text: next ? `${text} ${TOPIC_QUESTION[next]}` : text }],
      };
    });
  };

  const finish = async () => {
    setFinishing({ phase: 0, matches: 0 });
    const timers = [1, 2].map((p) => window.setTimeout(() => setFinishing((f) => (f ? { ...f, phase: Math.max(f.phase, p) } : f)), p * 900));
    const res = await complete.execute(cleanDraft(draft));
    if (!res.ok) {
      timers.forEach(clearTimeout);
      setFinishing(null);
      const problems = [...new Set(Object.values(res.fieldErrors ?? {}).flatMap((v) => v ?? []))].slice(0, 3);
      push({
        id: newId(),
        role: "assistant",
        tone: "error",
        text: problems.length ? `I couldn't save yet: ${problems.join(" ")} Tell me the correct details here, or fix them in the form.` : res.error,
      });
      return;
    }
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    window.setTimeout(() => setFinishing({ phase: 3, matches: res.data.scored }), 1900);
    window.setTimeout(() => router.push("/dashboard"), 3400);
  };

  const restart = () => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setState(openingState(initialDraft, firstName, hasResume));
    setInput("");
  };

  if (finishing) return <Finishing phase={finishing.phase} matches={finishing.matches} countries={draft.preferredCountries.length} />;

  return (
    <div className="flex flex-col">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="headline text-[32px] sm:text-[40px]">Let&apos;s set up your profile</h1>
          <p className="mt-2 text-[15px] text-muted">Answer in the chat. I&apos;ll fill in the details and check them as we go.</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={restart} disabled={busy} aria-label="Start the chat again">
            <RotateCcw /> Restart
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onSwitchToForm(draft)} disabled={busy}>
            <ListChecks /> Use the form
          </Button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-3" aria-label={`${progress.done} of ${progress.total} topics covered`}>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/10">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
        <span className="text-xs tabular-nums text-subtle">
          {progress.done}/{progress.total}
        </span>
      </div>

      <div className="rounded-xl border border-line bg-bg">
        <div ref={listRef} className="h-[min(56dvh,520px)] space-y-4 overflow-y-auto p-4 sm:p-5" role="log" aria-live="polite" aria-label="Onboarding chat">
          {messages.map((m) => (
            <Bubble key={m.id} message={m} />
          ))}
          {(turn.pending || upload.pending) && (
            <div className="flex items-center gap-2 text-sm text-subtle">
              <SkylarkMark className="size-6" />
              <Loader2 className="size-4 animate-spin" /> {upload.pending ? "Reading your resume…" : "Thinking…"}
            </div>
          )}
          {ready && !turn.pending && <Summary draft={draft} onFinish={() => void finish()} onEdit={() => onSwitchToForm(draft)} finishing={complete.pending} />}
        </div>

        <form
          className="flex items-end gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Button type="button" variant="ghost" size="icon" onClick={() => fileRef.current?.click()} disabled={busy} aria-label="Attach your resume">
            <Paperclip />
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            accept=".pdf,.docx,.txt"
            aria-label="Upload resume"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void onFile(f);
            }}
          />
          <label htmlFor="intake-input" className="sr-only">
            Your answer
          </label>
          <textarea
            id="intake-input"
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={2000}
            autoFocus
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={ready ? "Anything to change? Tell me here." : "Type your answer…"}
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-snug outline-none placeholder:text-subtle"
          />
          <Button type="submit" variant="accent" size="icon" disabled={busy || !input.trim()} aria-label="Send">
            <ArrowUp />
          </Button>
        </form>
      </div>
      <p className="mt-3 text-xs text-subtle">Answers are read by Google Gemini to fill in your profile, and every value is checked before it&apos;s saved. Press Enter to send, Shift+Enter for a new line.</p>
    </div>
  );
}

function Bubble({ message: m }: { message: ChatMessage }) {
  if (m.role === "user")
    return (
      <div className="flex flex-col items-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-fg px-4 py-2.5 text-[15px] leading-relaxed text-white">{m.text}</div>
        {!!m.saved?.length && (
          <span className="mt-1 inline-flex items-center gap-1 text-xs text-success">
            <FileCheck2 className="size-3" /> Saved: {m.saved.join(", ")}
          </span>
        )}
      </div>
    );
  return (
    <div className="flex items-start gap-2.5">
      <SkylarkMark className="mt-0.5 size-6 shrink-0" />
      <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-md px-4 py-2.5 text-[15px] leading-relaxed", m.tone === "error" ? "border border-danger/30 bg-danger-soft text-danger" : "bg-surface text-fg")}>{m.text}</div>
    </div>
  );
}

function Summary({ draft: d, onFinish, onEdit, finishing }: { draft: ProfileDraft; onFinish: () => void; onEdit: () => void; finishing: boolean }) {
  const rows = useMemo(() => {
    const role = d.experience.find((e) => e.title && e.company);
    return [
      ["Headline", d.headline],
      ["Lives in", [d.location.city, d.location.region, d.location.country && countryName(d.location.country)].filter(Boolean).join(", ")],
      ["Experience", `${d.yearsExperience} years · ${SENIORITY_LABEL[d.seniority]}`],
      ["Can work in", d.workAuthorizations.map((a) => `${countryName(a.country)} (${AUTH_STATUS_LABEL[a.status].toLowerCase()})`).join(", ") || "None yet"],
      ["Sponsorship", d.requiresSponsorship ? "Needed elsewhere" : "Not needed"],
      ["Relocation", d.willingToRelocate ? (d.relocationCountries.length ? d.relocationCountries.map(countryName).join(", ") : "Anywhere") : "Not open"],
      ["Roles", d.preferredRoles.join(", ")],
      ["Target countries", d.preferredCountries.map(countryName).join(", ")],
      ["Work mode", { any: "Open to all", remote: "Remote", hybrid: "Hybrid", onsite: "On-site" }[d.remotePreference]],
      ["Minimum salary", d.salaryExpectation ? `${d.salaryExpectation.min.toLocaleString()} ${d.salaryExpectation.currency}` : ""],
      ["Skills", d.skills.map((s) => s.name).join(", ")],
      ["Most recent role", role ? `${role.title} at ${role.company}` : ""],
      ["Education", d.education.map((e) => `${e.degree}, ${e.field} (${e.school})`).join("; ")],
      ["Links", [d.links.linkedin, d.links.github, d.links.portfolio].filter(Boolean).join(" · ")],
    ].filter(([, v]) => v) as [string, string][];
  }, [d]);

  return (
    <section className="rounded-xl border border-line-strong bg-surface p-4 sm:p-5" aria-label="Profile summary">
      <h2 className="text-sm font-medium">Your profile</h2>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-subtle">{k}</dt>
            <dd className="break-words text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onEdit}>
          Edit in the form
        </Button>
        <Button onClick={onFinish} loading={finishing}>
          Find my matches <ArrowRight />
        </Button>
      </div>
    </section>
  );
}
