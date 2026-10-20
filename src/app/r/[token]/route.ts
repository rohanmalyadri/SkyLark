import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { logger } from "@/lib/infra/logger";
import { partnerForLink } from "@/lib/services/partners";
import { setReferralCookie } from "@/lib/services/referral-cookie";

/**
 * A partner's share link. Resolves the opaque token to its partner, parks the attribution
 * in an httpOnly cookie, and sends the visitor to pricing with the discount already filled
 * in. An unknown token is not an error for the visitor — they just see normal pricing.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const partner = await partnerForLink(token);

  if (!partner || partner.status !== "active") {
    logger.info("referral.unknown_token", { tokenLength: token.length });
    redirect("/pricing");
  }

  await setReferralCookie({ linkToken: partner.linkToken, promoCode: partner.promoCode });
  redirect(`/pricing?promo=${encodeURIComponent(partner.promoCode)}`);
}
