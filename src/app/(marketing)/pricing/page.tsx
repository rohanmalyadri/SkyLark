import type { Metadata } from "next";
import { FaqList } from "@/components/marketing/faq";
import { PageMotion } from "@/components/marketing/motion";
import { PricingTable } from "@/components/marketing/pricing-table";
import type { Plan } from "@/lib/domain/types";
import { publicPlans } from "@/lib/services/public";

export const metadata: Metadata = { title: "Pricing", description: "Skylark plans: self-serve matching and tailoring, specialist-submitted applications, or a dedicated application specialist." };

const ROWS: { label: string; get: (p: Plan) => string }[] = [
  { label: "Ranked matches", get: (p) => (p.limits.matchesPerWeek === null ? "Unlimited" : `${p.limits.matchesPerWeek} / week`) },
  { label: "Tailored applications", get: (p) => (p.limits.tailoredPerMonth === null ? "Unlimited" : `${p.limits.tailoredPerMonth} / month`) },
  { label: "Specialist-reviewed & submitted", get: (p) => (p.limits.humanReviewsPerMonth === null ? "Unlimited" : p.limits.humanReviewsPerMonth === 0 ? "—" : `${p.limits.humanReviewsPerMonth} / month`) },
  { label: "Eligibility & sponsorship screening", get: () => "Included" },
  { label: "Application tracker", get: () => "Included" },
];

export default function PricingPage() {
  return (
    <>
      <section className="component component--textblocklarge page-head" aria-labelledby="pricing-title">
        <div className="text-block-center">
          <p className="label">Pricing</p>
          <h1 id="pricing-title" className="display --large --fill">
            Simple plans for a serious search. Prices are set by our operations team and always shown here first
          </h1>
        </div>
      </section>
      <section className="component component--pricing" aria-label="Plans">
        <PlansAndComparison />
      </section>
      <section className="component component--faq" aria-labelledby="faq-title">
        <div className="text-block-center faq-head">
          <p className="label">FAQs</p>
          <h2 id="faq-title" className="display --large --fill">
            Questions about plans
          </h2>
        </div>
        <FaqList />
      </section>
      <PageMotion />
    </>
  );
}

async function PlansAndComparison() {
  const plans = await publicPlans();
  return (
    <>
      <PricingTable plans={plans} />
      <div className="compare">
        <table>
          <caption className="sr-only">Plan comparison</caption>
          <thead>
            <tr>
              <th scope="col" className="text --xsmall --uppercase --bold">
                Compare plans
              </th>
              {plans.map((p) => (
                <th key={p.id} scope="col" className="display --xsmall">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="text --medium">
                  {r.label}
                </th>
                {plans.map((p) => (
                  <td key={p.id} className="text --small">
                    {r.get(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
