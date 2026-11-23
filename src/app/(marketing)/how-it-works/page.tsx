import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";
import { DEFAULT_REVIEW_CHECKLIST, REVIEW_SLA_HOURS } from "@/lib/domain/constants";
import { FACTOR_WEIGHTS, MATCH_MODEL_VERSION } from "@/lib/services/matching/engine";

export const metadata: Metadata = pageMetadata({
  path: "/how-it-works",
  title: "How it works",
  description: "The four stages of Skylark: your profile, ranked matches, tailored applications, and specialist-reviewed submissions you can track.",
});

const FACTOR_LABEL: Record<keyof typeof FACTOR_WEIGHTS, string> = {
  skills: "Skills",
  eligibility: "Work eligibility",
  experience: "Experience",
  location: "Location",
  sponsorship: "Visa sponsorship",
  preferences: "Your preferences",
  education: "Education",
};

const factors = (Object.keys(FACTOR_WEIGHTS) as (keyof typeof FACTOR_WEIGHTS)[]).sort((a, b) => FACTOR_WEIGHTS[b] - FACTOR_WEIGHTS[a]);

/** Explains each stage of the home page's "How it works" scroll. A click on a stage there lands on its section here (#profile, #match, #tailor, #apply). */
export default function HowItWorksPage() {
  return (
    <LegalPage
      label="How it works"
      title="From one profile to applications sent for you"
      intro={
        <p>
          Skylark works in four stages. You describe yourself once, we rank live roles against that profile and explain every score, each application is tailored from your real history, and a specialist checks it before it is submitted through the employer&apos;s own channel. Here is what happens at each stage.
        </p>
      }
      sections={[
        {
          id: "profile",
          title: "Your profile",
          body: (
            <>
              <p>Everything starts with a single profile. It takes about five minutes, and it powers every match and application that follows.</p>
              <ul>
                <li>Upload your resume once, as a PDF, DOCX or plain text file of up to 5 MB. We read your experience, education and skills from it so you don&apos;t have to type them again.</li>
                <li>Tell us where you can legally work, whether you need visa sponsorship, the roles you want, the countries you&apos;d move to and your salary expectations.</li>
                <li>Skills are checked against public skill vocabularies and locations against a reference dataset, so typos and made-up entries are caught early. A specialist reviews anything flagged before applications go out.</li>
                <li>Links such as GitHub are treated as supporting evidence only, never as a verified credential.</li>
              </ul>
            </>
          ),
        },
        {
          id: "match",
          title: "Ranked matches",
          body: (
            <>
              <p>
                We pull in live job listings and score each one against your profile. Roles you can&apos;t legally take are filtered out first, so you never waste time on them. The rest are ranked on {factors.length} published, weighted factors:
              </p>
              <ul>
                {factors.map((f) => (
                  <li key={f}>
                    {FACTOR_LABEL[f]}: {Math.round(FACTOR_WEIGHTS[f] * 100)}% of the score
                  </li>
                ))}
              </ul>
              <p>Every score explains itself, so you can see which skills matched, what was missing and why a role ranked where it did. The current scoring model is {MATCH_MODEL_VERSION}.</p>
            </>
          ),
        },
        {
          id: "tailor",
          title: "Tailored to fit",
          body: (
            <>
              <p>For each role you choose, your resume and cover letter are adapted to what that employer is asking for.</p>
              <ul>
                <li>Suggestions come only from your own history. Nothing is invented.</li>
                <li>You see every change and accept or reject it line by line. Nothing is applied automatically.</li>
                <li>A cover letter is written for each role, and every version is kept, so you can always see what was sent where.</li>
              </ul>
            </>
          ),
        },
        {
          id: "apply",
          title: "Applied for you, and tracked",
          body: (
            <>
              <p>Before anything is sent, a Skylark specialist reviews the application against a {DEFAULT_REVIEW_CHECKLIST.length}-point checklist:</p>
              <ul>
                {DEFAULT_REVIEW_CHECKLIST.map((c) => (
                  <li key={c.key}>{c.label}</li>
                ))}
              </ul>
              <p>
                We aim to complete each review within {REVIEW_SLA_HOURS} hours. The specialist then submits through the employer&apos;s own channel, and the application moves through your tracker from saved to offer, with in-app alerts whenever something changes. How many applications are reviewed and submitted for you depends on your <Link href="/pricing" className="legal-inline">plan</Link>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
