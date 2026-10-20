import { Send } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DeliveryBoard } from "@/components/admin/delivery-board";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { isOperator, requireStaff } from "@/lib/auth/dal";
import { board } from "@/lib/services/delivery";

export const metadata: Metadata = { title: "Delivery board" };

export default function DeliveryPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Delivery />
    </Suspense>
  );
}

async function Delivery() {
  const staff = await requireStaff();

  // Reviewers are staff but don't submit applications, so there is nothing here for them.
  if (!isOperator(staff)) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Delivery board" />
        <Panel>
          <EmptyState
            icon={<Send />}
            title="For application specialists"
            description="Submitting applications on a candidate's behalf is an operator role. Ask an admin to change your role if you need this."
          />
        </Panel>
      </>
    );
  }

  const { day, runs, totals, mine } = await board(staff);
  const pct = totals.target === 0 ? 0 : Math.round((totals.submitted / totals.target) * 100);

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Delivery board"
        description="Every candidate owed applications today. Each submission you record is backed by proof the candidate can see."
        actions={
          <>
            <Badge tone={pct >= 100 ? "success" : pct >= 60 ? "accent" : "warning"} dot>
              {totals.submitted}/{totals.target} sent today
            </Badge>
            {mine.length > 0 && <Badge>{mine.length} assigned to you</Badge>}
            {totals.short > 0 && <Badge tone="warning">{totals.short} closed short</Badge>}
          </>
        }
      />

      {runs.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Send />}
            title={`No runs scheduled for ${day}`}
            description="Runs are opened each working morning for every subscribed candidate who hasn't paused. Weekends are skipped."
          />
        </Panel>
      ) : (
        <DeliveryBoard runs={runs} operatorId={staff.id} />
      )}
    </>
  );
}
