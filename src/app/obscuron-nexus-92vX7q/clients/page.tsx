import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientFormDialog } from "@/components/admin/clients/client-form";
import { ClientTable } from "@/components/admin/clients/client-table";
import { PageHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";
import { listClients } from "@/lib/services/clients";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <Clients />
    </Suspense>
  );
}

async function Clients() {
  const staff = await requireStaff();
  const rows = await listClients(staff);
  return (
    <>
      <PageHeader eyebrow="Client management" title="Clients" description="Everyone you're working with, what they've agreed to pay and where each conversation stands." actions={<ClientFormDialog />} />
      <ClientTable rows={rows} now={new Date().toISOString()} canDelete={staff.role === "admin"} />
    </>
  );
}
