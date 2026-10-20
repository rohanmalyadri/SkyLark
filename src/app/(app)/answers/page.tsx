import type { Metadata } from "next";
import { Suspense } from "react";
import { AnswerVault } from "@/components/app/answers/answer-vault";
import { PageHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireCandidate } from "@/lib/auth/dal";
import { myAnswerStatus } from "@/lib/services/answers";
import { currentPlan } from "@/lib/services/billing";

export const metadata: Metadata = { title: "Application answers" };

export default function AnswersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Answers />
    </Suspense>
  );
}

async function Answers() {
  const user = await requireCandidate();
  const [{ answers, completeness }, { plan }] = await Promise.all([myAnswerStatus(user), currentPlan(user.id)]);

  return (
    <>
      <PageHeader
        eyebrow="Answer once"
        title="Application answers"
        description="Every employer portal asks the same two dozen questions. Answer them here and your specialist can complete any form without coming back to you."
      />
      <AnswerVault answers={answers} completeness={completeness} cap={plan.limits.applicationsPerDay} />
    </>
  );
}
