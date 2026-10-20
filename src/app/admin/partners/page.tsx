import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { NewPartnerForm, PartnerCard, PartnerEmpty, PromoCodeEditor } from "@/components/admin/partner-controls";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";
import { listPartnersWithStats, listPromoCodes } from "@/lib/services/partners";

export const metadata: Metadata = { title: "Partners & codes" };

export default function PartnersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Partners />
    </Suspense>
  );
}

async function Partners() {
  const staff = await requireStaff();
  const [partners, codes, h] = await Promise.all([listPartnersWithStats(staff), listPromoCodes(staff), headers()]);

  // Share links are shown with the host the operator is actually using, so copying one works.
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "skylark.dev";
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${host}`;

  const totals = partners.reduce((acc, p) => ({ conversions: acc.conversions + p.conversions, owed: acc.owed + p.earnings }), { conversions: 0, owed: 0 });

  return (
    <>
      <PageHeader
        eyebrow="Growth"
        title="Partners & codes"
        description="Affiliates who send candidates our way, what they've earned, and the campaign codes anyone can redeem."
        actions={
          <>
            <Badge dot tone="accent">
              {totals.conversions} conversions
            </Badge>
            <Badge>USD {totals.owed.toFixed(2)} owed</Badge>
          </>
        }
      />

      <div className="space-y-6">
        <NewPartnerForm origin={origin} />
        {partners.length === 0 ? (
          <PartnerEmpty />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {partners.map((p) => (
              <PartnerCard key={p.partner.id} stats={p} origin={origin} />
            ))}
          </div>
        )}
        <PromoCodeEditor codes={codes} />
      </div>
    </>
  );
}
