import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import type { Plan } from "@/lib/domain/types";

/** Structured data for search engines. `<` is escaped so no value can close the script tag. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** Who we are and what the site is: shown on the home page. */
export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/brand/skylark-lockup-mark.png`,
      description: SITE_DESCRIPTION,
      parentOrganization: { "@type": "Organization", name: "Obscuron X Labs", url: "https://www.obscuronxlabs.in/" },
    },
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, publisher: { "@id": `${SITE_URL}/#organization` }, inLanguage: "en-IN" },
  ],
};

/** The plans as one service with a monthly offer per plan, from the same data the pricing table shows. */
export function plansJsonLd(plans: Plan[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${SITE_NAME} job application service`,
    provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    url: `${SITE_URL}/pricing`,
    offers: plans
      .filter((p) => p.active && p.priceMonthly > 0)
      .map((p) => ({
        "@type": "Offer",
        name: p.name,
        description: p.tagline,
        price: p.priceMonthly,
        priceCurrency: p.currency,
        url: `${SITE_URL}/pricing`,
        priceSpecification: { "@type": "UnitPriceSpecification", price: p.priceMonthly, priceCurrency: p.currency, billingDuration: "P1M", unitText: "month" },
      })),
  };
}
