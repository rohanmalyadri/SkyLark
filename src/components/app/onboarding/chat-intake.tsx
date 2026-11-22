"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUp, Check, ListChecks, Paperclip, RotateCcw } from "lucide-react";
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
  /** Restored from storage after a reload: shown without the entrance animation. */
  restored?: boolean;
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
      if (saved) {
        const parsed = JSON.parse(saved) as ChatState;
        // Messages brought back from storage render in place; only new ones animate in.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from storage
        setState({ ...parsed, messages: parsed.messages.map((m) => ({ ...m, restored: true })) });
      }
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

  const thinking = turn.pending || upload.pending;
  const canSend = !busy && input.trim().length > 0;

  return (
    <div className="flex flex-col">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SOFT} className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="headline text-[32px] sm:text-[40px]">Let&apos;s set up your profile</h1>
          <p className="mt-2 text-[15px] text-muted">Just answer in your own words. I&apos;ll fill in the details and check them as we go.</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={restart} disabled={busy} aria-label="Start the chat again">
            <RotateCcw /> Restart
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onSwitchToForm(draft)} disabled={busy}>
            <ListChecks /> Use the form
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...SPRING_SOFT, delay: 0.06 }}
        className="relative overflow-hidden rounded-[28px] border border-line bg-bg shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_-12px_rgba(0,0,0,0.12)]"
      >
        {/* Progress: a hairline along the top edge that springs forward as topics are covered. */}
        <div className="absolute inset-x-0 top-0 z-20 h-[3px] bg-black/[0.04]" role="progressbar" aria-label="Profile progress" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
          <motion.div className="h-full origin-left rounded-r-full bg-accent" initial={false} animate={{ scaleX: progress.done / progress.total }} transition={SPRING_SOFT} style={{ width: "100%" }} />
        </div>
        <div className="flex items-center justify-between border-b border-line/70 px-5 pb-3 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="relative grid size-8 place-items-center rounded-full bg-surface">
              <SkylarkMark className="size-5" />
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-bg bg-success" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-medium">Skylark</span>
              <span className="block text-xs text-subtle">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={thinking ? "t" : "o"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="inline-block">
                    {upload.pending ? "Reading your resume…" : turn.pending ? "Typing…" : "Profile assistant"}
                  </motion.span>
                </AnimatePresence>
              </span>
            </span>
          </div>
          <span className="text-xs tabular-nums text-subtle">
            {progress.done} of {progress.total}
          </span>
        </div>

        <div
          ref={listRef}
          className="h-[min(50dvh,520px)] overflow-y-auto overscroll-contain px-4 pb-6 pt-5 [mask-image:linear-gradient(to_bottom,transparent,black_20px,black_calc(100%-20px),transparent)] sm:px-6"
          role="log"
          aria-live="polite"
          aria-label="Onboarding chat"
        >
          <motion.ul layout="position" className="flex flex-col">
            <AnimatePresence initial={true}>
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const next = messages[i + 1];
                const firstOfGroup = prev?.role !== m.role;
                const lastOfGroup = next?.role !== m.role && !(m.role === "assistant" && i === messages.length - 1 && thinking);
                return <Bubble key={m.id} message={m} firstOfGroup={firstOfGroup} lastOfGroup={lastOfGroup} index={i} fresh={!m.restored} />;
              })}
              {thinking && <TypingBubble key="typing" />}
            </AnimatePresence>
          </motion.ul>
          <AnimatePresence>{ready && !turn.pending && <Summary key="summary" draft={draft} onFinish={() => void finish()} onEdit={() => onSwitchToForm(draft)} finishing={complete.pending} />}</AnimatePresence>
        </div>

        <form
          className="border-t border-line/70 bg-bg/80 p-3 backdrop-blur-xl sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="flex items-end gap-1.5 rounded-[22px] border border-line-strong bg-bg py-1 pl-1.5 pr-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] duration-300 focus-within:border-accent/50 focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_14%,transparent)]">
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              transition={SPRING_SNAPPY}
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label="Attach your resume"
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-fg disabled:opacity-40"
            >
              <Paperclip className="size-[18px]" />
            </motion.button>
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
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-1.5 py-[7px] text-[15px] leading-snug outline-none placeholder:text-subtle"
            />
            <motion.button
              type="submit"
              aria-label="Send"
              disabled={!canSend}
              initial={false}
              animate={canSend ? { scale: 1, opacity: 1 } : { scale: 0.82, opacity: 0.35 }}
              whileTap={canSend ? { scale: 0.86 } : undefined}
              transition={SPRING_SNAPPY}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-white shadow-[0_4px_12px_-4px_var(--accent)]"
            >
              <ArrowUp className="size-[18px]" strokeWidth={2.5} />
            </motion.button>
          </div>
        </form>
      </motion.div>
      <p className="mt-3 px-1 text-xs text-subtle">Answers are read by Google Gemini to fill in your profile, and every value is checked before it&apos;s saved. Enter to send, Shift+Enter for a new line.</p>
    </div>
  );
}

/* ---------- Motion ---------- */

/** Apple-style springs: quick to start, settle without wobble. */
const SPRING_BUBBLE = { type: "spring", stiffness: 520, damping: 38, mass: 0.9 } as const;
const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 30, mass: 1 } as const;
const SPRING_SNAPPY = { type: "spring", stiffness: 700, damping: 32 } as const;

function Bubble({ message: m, firstOfGroup, lastOfGroup, index, fresh }: { message: ChatMessage; firstOfGroup: boolean; lastOfGroup: boolean; index: number; fresh: boolean }) {
  const user = m.role === "user";
  // The opening messages arrive one after another; later ones appear as they're sent.
  const delay = fresh && index < 2 ? 0.25 + index * 0.45 : user ? 0 : 0.05;
  return (
    <motion.li
      layout="position"
      initial={fresh ? { opacity: 0, y: 16, scale: 0.9, filter: "blur(6px)" } : false}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
      transition={{ ...SPRING_BUBBLE, delay, filter: { duration: 0.3, delay } }}
      style={{ transformOrigin: user ? "100% 100%" : "0% 100%" }}
      className={cn("flex w-full", user ? "justify-end" : "items-end gap-2", firstOfGroup ? "mt-4 first:mt-0" : "mt-1")}
    >
      {!user && (
        <span className="mb-0.5 grid size-7 shrink-0 place-items-center">
          {lastOfGroup && (
            <motion.span initial={fresh ? { opacity: 0, scale: 0.6 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ ...SPRING_SNAPPY, delay }} className="grid size-7 place-items-center rounded-full bg-surface">
              <SkylarkMark className="size-4" />
            </motion.span>
          )}
        </span>
      )}
      <div className={cn("flex max-w-[82%] flex-col", user ? "items-end" : "items-start")}>
        <div
          className={cn(
            "whitespace-pre-wrap px-4 py-2.5 text-[15px] leading-[1.45] tracking-[-0.005em]",
            user
              ? cn("rounded-[20px] bg-fg text-white", lastOfGroup && "rounded-br-[6px]")
              : m.tone === "error"
                ? cn("rounded-[20px] border border-danger/25 bg-danger-soft text-danger", lastOfGroup && "rounded-bl-[6px]")
                : cn("rounded-[20px] bg-surface text-fg", lastOfGroup && "rounded-bl-[6px]"),
          )}
        >
          {!user && fresh && m.tone !== "error" ? <RevealText text={m.text} delay={delay + 0.08} /> : m.text}
        </div>
        {!!m.saved?.length && (
          <motion.ul className="mt-1.5 flex flex-wrap justify-end gap-1" aria-label="Saved to your profile" initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }}>
            {m.saved.map((s) => (
              <motion.li
                key={s}
                variants={{ hidden: { opacity: 0, scale: 0.6, y: 4 }, shown: { opacity: 1, scale: 1, y: 0 } }}
                transition={SPRING_SNAPPY}
                className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success"
              >
                <Check className="size-3" strokeWidth={3} /> {s}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </motion.li>
  );
}

/** Words fade up and un-blur in sequence, like text settling into place. */
function RevealText({ text, delay }: { text: string; delay: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{text}</>;
  const words = text.split(/(\s+)/);
  const step = Math.min(0.03, 0.9 / Math.max(1, words.length / 2));
  return (
    <span aria-label={text}>
      {words.map((w, i) =>
        /^\s+$/.test(w) ? (
          w
        ) : (
          <motion.span
            key={i}
            aria-hidden
            className="inline-block"
            initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1], delay: delay + (i / 2) * step }}
          >
            {w}
          </motion.span>
        ),
      )}
    </span>
  );
}

function TypingBubble() {
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.14 } }}
      transition={SPRING_BUBBLE}
      style={{ transformOrigin: "0% 100%" }}
      className="mt-4 flex items-end gap-2"
      aria-label="Skylark is typing"
    >
      <span className="mb-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface">
        <SkylarkMark className="size-4" />
      </span>
      <span className="flex h-[38px] items-center gap-1 rounded-[20px] rounded-bl-[6px] bg-surface px-4">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-[7px] rounded-full bg-subtle"
            animate={{ y: [0, -4, 0], opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.16 }}
          />
        ))}
      </span>
    </motion.li>
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
    <motion.section
      initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 12, transition: { duration: 0.15 } }}
      transition={{ ...SPRING_SOFT, delay: 0.35, filter: { duration: 0.35, delay: 0.35 } }}
      className="mt-6 rounded-[22px] border border-line bg-gradient-to-b from-surface to-bg p-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] sm:p-6"
      aria-label="Profile summary"
    >
      <div className="flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-full bg-success text-white">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        <h2 className="text-[15px] font-medium">Your profile is ready</h2>
      </div>
      <motion.dl
        className="mt-4 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-[max-content_1fr]"
        initial="hidden"
        animate="shown"
        variants={{ shown: { transition: { staggerChildren: 0.035, delayChildren: 0.5 } } }}
      >
        {rows.map(([k, v]) => (
          <motion.div key={k} className="contents" variants={{ hidden: {}, shown: {} }}>
            <motion.dt variants={{ hidden: { opacity: 0, x: -6 }, shown: { opacity: 1, x: 0 } }} transition={SPRING_SOFT} className="text-subtle">
              {k}
            </motion.dt>
            <motion.dd variants={{ hidden: { opacity: 0, x: -6 }, shown: { opacity: 1, x: 0 } }} transition={SPRING_SOFT} className="break-words text-fg">
              {v}
            </motion.dd>
          </motion.div>
        ))}
      </motion.dl>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onEdit}>
          Edit in the form
        </Button>
        <Button onClick={onFinish} loading={finishing}>
          Find my matches <ArrowRight />
        </Button>
      </div>
    </motion.section>
  );
}
