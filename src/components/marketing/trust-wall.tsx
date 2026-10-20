import { ClipboardCheck, Eye, FileCheck2, Pause, ShieldCheck, Undo2 } from "lucide-react";

/**
 * The trust wall. Every competitor in this space fills this slot with testimonial quotes;
 * we fill it with commitments that are checkable inside the product, because a quote proves
 * nothing and a confirmation reference proves something. Each item points at a real
 * mechanism built elsewhere in the codebase.
 */

const COMMITMENTS = [
  {
    icon: FileCheck2,
    title: "Every application comes with proof",
    body: "When a specialist submits on your behalf they record the portal and the employer's confirmation reference against that application. If it isn't in your tracker, it didn't happen.",
  },
  {
    icon: Eye,
    title: "You see the score before we apply",
    body: "Each match shows the seven factors behind its score, including the ones that count against it. You set the floor below which we don't apply at all.",
  },
  {
    icon: ClipboardCheck,
    title: "A person checks the work",
    body: "Tailored applications go through a five-point review — eligibility, accuracy, role specificity, hard requirements, portal details — before anything is sent.",
  },
  {
    icon: ShieldCheck,
    title: "Your answers are yours",
    body: "Voluntary self-identification never reaches match scoring or any AI prompt. A specialist can only read it by stating which form needs it, and every unlock is written to the audit log.",
  },
  {
    icon: Pause,
    title: "Pause without penalty",
    body: "Going on holiday or deep in final rounds? Pause applications from your dashboard. Your plan and your place are untouched.",
  },
  {
    icon: Undo2,
    title: "A short day is a short day",
    body: "If fewer roles clear your score floor, we tell you the number and the reason rather than padding the count with applications you didn't want.",
  },
];

export function TrustWall() {
  return (
    <ul className="trust-wall">
      {COMMITMENTS.map((c) => (
        <li key={c.title} className="trust-wall__item">
          <span className="trust-wall__icon" aria-hidden>
            <c.icon />
          </span>
          <h3 className="title --small">{c.title}</h3>
          <p className="text --small">{c.body}</p>
        </li>
      ))}
    </ul>
  );
}
