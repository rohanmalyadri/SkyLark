import { AlertTriangle, BadgeCheck, Clock3, XCircle } from "lucide-react";
import { VERIFICATION_META } from "@/lib/domain/constants";
import type { ProfileVerification } from "@/lib/domain/types";
import { cn, timeAgo } from "@/lib/utils";

const ICON = { pending: Clock3, approved: BadgeCheck, changes_requested: AlertTriangle, rejected: XCircle } as const;
const STYLE = {
  pending: "border-warning/30 bg-warning-soft/40",
  approved: "border-success/25 bg-success-soft/40",
  changes_requested: "border-accent-line bg-accent-soft/40",
  rejected: "border-danger/30 bg-danger-soft/40",
} as const;
const TONE = { pending: "text-warning", approved: "text-success", changes_requested: "text-accent", rejected: "text-danger" } as const;
const NEXT = {
  pending: "You can keep browsing matches while a specialist checks your profile. Sending applications for human review unlocks once it's verified.",
  approved: "Your details were checked by a specialist. Material changes, like a new GitHub account, send the profile back for a quick re-check.",
  changes_requested: "Update the details below and save. Your profile goes straight back into the review queue.",
  rejected: "Matching and applications are paused for this profile. Contact us through the team page if you think this is a mistake.",
} as const;

/** The candidate's view of human verification: status, the reviewer's note, and what happens next. */
export function VerificationBanner({ verification, compact }: { verification: ProfileVerification | null; compact?: boolean }) {
  if (!verification) return null;
  const meta = VERIFICATION_META[verification.status];
  const Icon = ICON[verification.status];
  const showNote = !!verification.note && verification.status !== "pending";
  return (
    <div role="status" className={cn("flex gap-3 rounded-lg border p-4", STYLE[verification.status])}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", TONE[verification.status])} aria-hidden />
      <div className="min-w-0 text-[13px]">
        <p className="font-medium text-fg">
          Profile verification: {meta.label}
          <span className="font-normal text-subtle"> · {verification.reviewedAt ? `reviewed ${timeAgo(verification.reviewedAt)}` : `submitted ${timeAgo(verification.submittedAt)}`}</span>
        </p>
        {showNote && <p className="mt-1 whitespace-pre-line text-fg">“{verification.note}”</p>}
        {!compact && <p className="mt-1 text-muted">{NEXT[verification.status]}</p>}
      </div>
    </div>
  );
}
