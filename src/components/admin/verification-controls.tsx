"use client";

import { CheckCircle2, MessageSquareWarning, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";
import { decideSkillRequestAction, decideVerificationAction, refreshEnrichmentAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import type { VerificationStatus } from "@/lib/domain/types";
import { useAction } from "@/lib/hooks/use-action";

/** Approve / request changes / reject. The server re-checks the reviewer's role on every call. */
export function VerificationControls({ userId, status, hasProfile }: { userId: string; status: VerificationStatus | null; hasProfile: boolean }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const decide = useAction(decideVerificationAction);

  const submit = async (decision: "approved" | "changes_requested" | "rejected") => {
    setError(null);
    const res = await decide.execute(userId, decision, note);
    if (!res.ok) setError(res.fieldErrors?.note?.[0] ?? res.error);
    else setNote("");
  };

  if (!hasProfile) return <p className="text-[13px] text-muted">This candidate hasn&apos;t completed onboarding, so there&apos;s nothing to review yet.</p>;

  return (
    <div className="space-y-4">
      <Field label="Note to the candidate" htmlFor="verification-note" hint="Required to reject or request changes. The candidate sees it on their profile." error={error ?? undefined}>
        <Textarea id="verification-note" value={note} onChange={(e) => (setNote(e.target.value), setError(null))} maxLength={2000} className="min-h-24 text-[13px]" placeholder="e.g. Your GitHub link points to a different person — please update it." aria-invalid={!!error || undefined} />
      </Field>
      <div className="grid gap-2">
        <Button loading={decide.pending} onClick={() => void submit("approved")} disabled={status === "approved"}>
          <CheckCircle2 /> {status === "approved" ? "Approved" : "Approve profile"}
        </Button>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" loading={decide.pending} onClick={() => void submit("changes_requested")}>
            <MessageSquareWarning /> Request changes
          </Button>
          <Button variant="danger" loading={decide.pending} onClick={() => void submit("rejected")} disabled={status === "rejected"}>
            <XCircle /> Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RefreshGithubButton({ userId }: { userId: string }) {
  const refresh = useAction(refreshEnrichmentAction);
  return (
    <Button size="sm" variant="ghost" loading={refresh.pending} onClick={() => void refresh.execute(userId)}>
      <RefreshCw /> Re-check
    </Button>
  );
}

export function SkillRequestControls({ id }: { id: string }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const decide = useAction(decideSkillRequestAction);
  const submit = async (decision: "approved" | "rejected") => {
    setError(null);
    const res = await decide.execute(id, decision, note);
    if (!res.ok) setError(res.fieldErrors?.note?.[0] ?? res.error);
  };
  return (
    <div className="space-y-2">
      <Textarea value={note} onChange={(e) => (setNote(e.target.value), setError(null))} maxLength={500} placeholder="Note to the candidate (required to reject)" aria-label="Note to the candidate" aria-invalid={!!error || undefined} className="min-h-16 text-[13px]" />
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" loading={decide.pending} onClick={() => void submit("approved")}>
          <CheckCircle2 /> Approve skill
        </Button>
        <Button size="sm" variant="danger" loading={decide.pending} onClick={() => void submit("rejected")}>
          <XCircle /> Reject
        </Button>
      </div>
    </div>
  );
}
