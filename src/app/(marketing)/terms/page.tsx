import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that apply when you purchase a Skylark plan.",
};

export default function TermsPage() {
  return (
    <LegalPage
      label="Terms"
      title="Terms & Conditions"
      updated="17 October 2026"
      intro={<p>These terms apply when you purchase a Skylark plan. Please read them carefully before making a payment.</p>}
      sections={[
        {
          id: "service-overview",
          title: "Service Overview",
          body: (
            <p>
              By purchasing any of our plans (Basic, Professional, or Executive), you agree to receive job application and career support services as outlined in the selected plan. Services may include applying to jobs on your behalf, resume optimization, AI-powered matching, and dedicated assistance.
            </p>
          ),
        },
        {
          id: "one-time-payment",
          title: "One-Time Payment Policy",
          body: (
            <>
              <p>All plans are offered as a one-time, non-recurring payment.</p>
              <p>The payment grants access to services for a defined service cycle, which begins from the date of onboarding completion or 48 hours from payment (whichever is earlier).</p>
              <p>The service cycle will conclude based on:</p>
              <ul>
                <li>Completion of promised deliverables (e.g., number of applications), OR</li>
                <li>Completion of the defined duration of the plan</li>
              </ul>
              <p>This is not a subscription and will not automatically renew.</p>
            </>
          ),
        },
        {
          id: "renewal",
          title: "Renewal & Re-engagement Pricing",
          body: (
            <>
              <p>Upon completion of the service cycle, services will be considered fulfilled.</p>
              <p>Users may opt for re-engagement:</p>
              <ul>
                <li>Only through manual confirmation via the assigned Account Manager</li>
                <li>Based on current pricing and service structure</li>
                <li>Requires a new payment before continuation</li>
              </ul>
              <p>No automatic renewals will occur.</p>
            </>
          ),
        },
        {
          id: "no-refund",
          title: "No Refund Policy",
          body: (
            <>
              <p>All payments are final and non-refundable.</p>
              <p>Once:</p>
              <ul>
                <li>Service is initiated, OR</li>
                <li>Onboarding process has begun</li>
              </ul>
              <p>No cancellations or refunds will be processed under any circumstances.</p>
            </>
          ),
        },
        {
          id: "account-manager",
          title: "Dedicated Account Manager",
          body: <p>Each user will be assigned an Account Manager for coordination, updates, and communication via email and/or chat, depending on the plan.</p>,
        },
        {
          id: "scope",
          title: "Service Scope & Limitations",
          body: (
            <>
              <p>We strive to provide high-quality services; however:</p>
              <ul>
                <li>No job placement guarantee is provided</li>
                <li>Application volumes are indicative and may vary.</li>
                <li>
                  Outcomes depend on:
                  <ul>
                    <li>Market conditions</li>
                    <li>Profile suitability</li>
                    <li>Availability of roles</li>
                  </ul>
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "responsibilities",
          title: "User Responsibilities",
          body: (
            <>
              <p>Users agree to:</p>
              <ul>
                <li>Provide accurate and complete information</li>
                <li>Share updated resumes and requirements</li>
                <li>Respond within reasonable timelines</li>
              </ul>
              <p>Note: Delays in response may impact service timelines and outcomes.</p>
            </>
          ),
        },
        {
          id: "ai",
          title: "AI & Automation Disclaimer",
          body: (
            <>
              <p>Certain features use AI-powered tools. While we aim for accuracy:</p>
              <ul>
                <li>Results may vary.</li>
                <li>Users are responsible for reviewing outputs before use.</li>
              </ul>
            </>
          ),
        },
        {
          id: "delays",
          title: "Service Delays & Dependencies",
          body: (
            <>
              <p>The company shall not be held responsible for delays caused due to:</p>
              <ul>
                <li>Incomplete or incorrect user information</li>
                <li>Lack of response from the user</li>
                <li>Third-party platform processing times</li>
                <li>External factors such as job market conditions or platform limitations</li>
              </ul>
            </>
          ),
        },
        {
          id: "acceptance",
          title: "Acceptance of Terms",
          body: (
            <>
              <p>By proceeding with the payment, you confirm that:</p>
              <ul>
                <li>You have read and understood these Terms &amp; Conditions</li>
                <li>You agree to the one-time payment structure and renewal pricing</li>
                <li>You accept all policies outlined above</li>
              </ul>
            </>
          ),
        },
      ]}
    />
  );
}
