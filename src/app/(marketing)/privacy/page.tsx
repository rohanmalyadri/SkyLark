import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Skylark collects, uses, stores and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      label="Privacy"
      title="Privacy Policy"
      updated="17 October 2026"
      intro={
        <p>
          Skylark helps you find roles you are eligible for and prepares applications on your behalf. That only works with information about you, so this policy explains what we collect, why, who sees it and the choices you have. We do not sell your personal information.
        </p>
      }
      sections={[
        {
          id: "collect",
          title: "Information we collect",
          body: (
            <>
              <p>Information you give us:</p>
              <ul>
                <li>Account details: your name, email address and password (stored only as a secure hash), or your Google profile name, email and photo if you sign in with Google.</li>
                <li>Profile details: headline, summary, location, work authorization and sponsorship needs, preferred roles and countries, salary expectations, skills, experience and links you choose to add.</li>
                <li>Documents: resumes you upload (PDF, DOCX or text, up to 5 MB) and the text we extract from them, plus an optional profile photo.</li>
                <li>Application activity: roles you save or dismiss, tailored resumes and cover letters, the edits you accept or reject, notes and application statuses.</li>
              </ul>
              <p>Information created as you use Skylark: match scores and their reasons, review checklists completed by our specialists, the outcome of profile verification and any note from the reviewer, notifications, and security and audit records of sign-ins and important account changes.</p>
              <p>
                Public information we look up: if you add a GitHub link, we read your public GitHub profile and repositories through GitHub&apos;s official API to confirm the account exists and to show reviewers which languages appear in your public work. We treat this as supporting evidence, never as a verified credential. We do not access LinkedIn; a LinkedIn link is shown to reviewers as self-reported. We never scrape websites.
              </p>
            </>
          ),
        },
        {
          id: "use",
          title: "How we use your information",
          body: (
            <ul>
              <li>To match you with roles, explain each match and filter out roles you cannot legally take.</li>
              <li>To check that profile details are genuine: skills are matched against public skill vocabularies, locations against a reference dataset, and a specialist reviews flagged details before applications are sent.</li>
              <li>To tailor resumes and cover letters for specific roles, which you review and approve before use.</li>
              <li>To let our specialists review applications and, where your plan includes it, submit them through the employer&apos;s own channel.</li>
              <li>To run your account: sign-in, notifications, billing, support and keeping the service secure.</li>
              <li>To improve matching and the product in aggregate. We do not use your documents to train third-party AI models.</li>
            </ul>
          ),
        },
        {
          id: "ai",
          title: "AI processing",
          body: (
            <p>
              When you request tailoring, the relevant parts of your profile and resume, together with the job description, may be sent to our AI provider (Anthropic&apos;s Claude) to draft suggestions. Suggestions are never applied automatically: you accept or reject every change, and nothing is submitted without your approval and a specialist&apos;s check.
            </p>
          ),
        },
        {
          id: "share",
          title: "When we share information",
          body: (
            <>
              <p>We share information only as needed to provide Skylark:</p>
              <ul>
                <li>With employers, only for applications you have approved, and only the materials prepared for that application.</li>
                <li>With service providers that host and run Skylark on our behalf, such as our database and file storage provider, our hosting provider, Google (if you use Google sign-in) and our AI provider for tailoring.</li>
                <li>With public reference services, only the text needed for a lookup: skill names you search for are sent to the Stack Exchange and ESCO skill APIs, and a GitHub username you add is sent to GitHub. No other profile details are included.</li>
                <li>When required by law, or to protect the rights, safety and security of our users and the service.</li>
              </ul>
              <p>We do not sell personal information or share it for advertising.</p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies",
          body: (
            <p>
              Skylark uses only cookies needed for the service to work: a signed session cookie that keeps you signed in, and a short-lived cookie that protects Google sign-in from tampering. We do not use advertising or third-party tracking cookies.
            </p>
          ),
        },
        {
          id: "security",
          title: "Storage and security",
          body: (
            <p>
              Your data is stored with row-level access controls, so every request runs as you and other users&apos; data is unreachable. Resumes are kept in private storage and served through short-lived signed links, passwords are hashed, staff access is limited by role and logged, and service credentials never reach your browser. No system is perfectly secure, but we work to protect your information and will notify you if a breach affects you.
            </p>
          ),
        },
        {
          id: "retention",
          title: "Retention",
          body: <p>We keep your information while your account is active and as long as needed to provide the service, resolve disputes and meet legal obligations. When you ask us to delete your account, we delete or anonymise your personal information unless we must keep some of it by law.</p>,
        },
        {
          id: "rights",
          title: "Your choices and rights",
          body: (
            <>
              <p>
                You can view and update most of your information in{" "}
                <Link href="/profile" className="legal-inline">
                  Profile
                </Link>{" "}
                and{" "}
                <Link href="/settings" className="legal-inline">
                  Settings
                </Link>
                , remove documents, and choose which notifications you receive. In Settings, under &ldquo;Your data&rdquo;, you can download a copy of everything we hold about you or permanently delete your account. Depending on where you live, you may also have the right to object to or restrict how we use your data. For any other request, contact us through the team page and we will respond within a reasonable time.
              </p>
            </>
          ),
        },
        {
          id: "children",
          title: "Children",
          body: <p>Skylark is intended for people old enough to work in the countries they are applying to, and not for children under 16. We do not knowingly collect information from children.</p>,
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: <p>We may update this policy as Skylark changes. We will post the new version here with a new date, and tell you in the product or by email if the changes are significant.</p>,
        },
      ]}
    />
  );
}
