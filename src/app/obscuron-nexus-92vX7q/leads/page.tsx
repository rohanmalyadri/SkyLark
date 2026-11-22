import type { Metadata } from "next";
import { Suspense } from "react";
import { LeadInbox } from "@/components/admin/lead-inbox";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";
import { listLeads } from "@/lib/services/leads";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Leads />
    </Suspense>
  );
}

async function Leads() {
  const staff = await requireStaff();
  const leads = await listLeads(staff);
  const unanswered = leads.filter((l) => l.status === "new").length;

  return (
    <>
      <PageHeader
        eyebrow="Growth"
        title="Leads"
        description="Enquiries from the website, with who owns each one and what was said."
        actions={
          unanswered > 0 ? (
            <Badge tone="accent" dot pulse>
              {unanswered} unanswered
            </Badge>
          ) : (
            <Badge tone="success">All answered</Badge>
          )
        }
      />
      <LeadInbox leads={leads} />
    </>
  );
}
