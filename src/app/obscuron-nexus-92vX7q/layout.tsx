import type { Metadata } from "next";
import { AppShell } from "@/components/app/shell/app-shell";

/*
 * The staff console lives at an unlisted address (not /admin) and is kept out of search
 * engines. That only cuts down drive-by probing: every page still requires a staff account.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell variant="admin">{children}</AppShell>;
}
