import Link from "next/link";
import { PageMotion } from "./motion";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/** Shared layout for Privacy and Terms: centred heading, sticky contents list, numbered sections. */
export function LegalPage({ label, title, updated, intro, sections }: { label: string; title: string; updated: string; intro: React.ReactNode; sections: LegalSection[] }) {
  return (
    <>
      <section className="component component--textblocklarge page-head legal-head" aria-labelledby="legal-title">
        <div className="text-block-center">
          <p className="label">{label}</p>
          <h1 id="legal-title" className="display --large">
            {title}
          </h1>
          <p className="text --medium legal-updated">Last updated {updated}</p>
        </div>
      </section>

      <section className="component component--legal">
        <div className="legal">
          <nav className="legal-toc" aria-label="On this page">
            <p className="text --xsmall --uppercase --bold">On this page</p>
            <ol>
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text --small">
                    <span className="tabular">{String(i + 1).padStart(2, "0")}</span> {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="legal-body">
            <div className="text --large legal-intro">{intro}</div>
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="legal-section" aria-labelledby={`${s.id}-h`}>
                <h2 id={`${s.id}-h`} className="display --xsmall">
                  <span className="legal-num tabular">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </h2>
                <div className="text --medium legal-text">{s.body}</div>
              </section>
            ))}
            <p className="text --medium legal-foot">
              Questions about this page? Reach the people behind Skylark through the{" "}
              <Link href="/team" className="legal-inline">
                team page
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
      <PageMotion />
    </>
  );
}
