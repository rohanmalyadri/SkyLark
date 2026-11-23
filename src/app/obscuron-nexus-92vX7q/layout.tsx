import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app/shell/app-shell";
import { requireStaff } from "@/lib/auth/dal";

/*
 * The staff console lives at an unlisted address (not /admin) and is kept out of search
 * engines. That only cuts down drive-by probing: every page still requires a staff account.
 * The shell itself is rendered only after the staff check, so anyone else sees the plain 404
 * page and never the console's navigation. Each page repeats the check for its own data.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <StaffOnly>{children}</StaffOnly>
    </Suspense>
  );
}

async function StaffOnly({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return <AppShell variant="admin">{children}</AppShell>;
}
