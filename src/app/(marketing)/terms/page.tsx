import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = pageMetadata({
  path: "/terms",
  title: "Terms & Conditions",
  description: "The terms that apply when you purchase a Skylark plan.",
});

export default function TermsPage() {
  return (
    <LegalPage
      label="Terms"
      title="Terms & Conditions"
      updated="22 November 2026"
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
          id: "subscription",
          title: "Subscription & Automatic Renewal",
          body: (
            <>
              <p>Paid plans are subscriptions billed monthly or annually, as chosen at checkout.</p>
              <p>Your first payment is taken when you subscribe. Your subscription then renews automatically at the end of each billing period, and the plan price in effect at that time is charged to the card or UPI mandate you authorised, until you cancel.</p>
              <p>Payments are processed by Razorpay. We do not store your card or bank details.</p>
              <p>If a renewal payment fails, we may retry it. If it cannot be collected, your plan will be paused or moved back to the free allowance.</p>
            </>
          ),
        },
        {
          id: "cancellation",
          title: "Cancellation",
          body: (
            <>
              <p>You can cancel at any time from Settings → Subscription &amp; billing.</p>
              <p>Cancelling stops future renewals. You keep access to your plan until the end of the billing period you have already paid for, and you will not be charged again.</p>
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
              <p>No refunds, including partial refunds for unused time, will be processed under any circumstances. Cancelling only stops future renewals.</p>
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
                <li>You agree to the subscription structure, including automatic renewal until you cancel</li>
                <li>You accept all policies outlined above</li>
              </ul>
            </>
          ),
        },
      ]}
    />
  );
}
