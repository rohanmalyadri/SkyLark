import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";
import { AppShell } from "@/components/app/shell/app-shell";

/** Sign-in and app pages stay out of search results. */
export const metadata: Metadata = { robots: NO_INDEX };

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return <AppShell variant="candidate">{children}</AppShell>;
}
