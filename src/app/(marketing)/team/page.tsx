import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageMotion } from "@/components/marketing/motion";

export const metadata: Metadata = {
  title: "Team",
  description: "Synapse X, the team behind Skylark.",
};

const MEMBERS = [
  {
    name: "Rohan Malyadri",
    role: "CEO & CTO",
    work: [
      "Full-stack development",
      "UI & UX",
      "Product Strategy",
      "Cloud & DevOps",
    ],
    photo: "/team/rohan-malyadri.jpg",
    portfolio: "https://www.rohanmalyadri.in/",
  },
  {
    name: "Abhiram Meda",
    role: "CFO & COO",
    work: [
      "Graphic Design",
      "Research",
      "Visual Design",
      "Operations Management",
    ],
    photo: "/team/abhiram-meda.jpg",
    portfolio: "https://github.com/medaabhiram046/",
  },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("");

export default function TeamPage() {
  return (
    <>
      <section className="component component--textblocklarge page-head team-head" aria-labelledby="team-title">
        <div className="text-block-center">
          <p className="label">Team</p>
          <h1 id="team-title" className="display --large --fill">
            Synapse X, the people who designed and built Skylark
          </h1>
        </div>
      </section>

      <section className="component component--team" aria-label="Members">
        <ul className="team-grid">
          {MEMBERS.map((m) => (
            <li key={m.name} className="team-card --magnet">
              <div className="portrait">
                <span className="gradient" aria-hidden />
                {m.photo ? (
                  <Image src={m.photo} alt={`Portrait of ${m.name}`} fill sizes="(min-width: 1101px) 23vw, 78vw" className="photo" />
                ) : (
                  <span className="monogram display --xlarge --serif" aria-hidden>
                    {initials(m.name)}
                  </span>
                )}
              </div>
              <div className="meta">
                <p className="text --large role">{m.role}</p>
                <h2 className="display --xsmall">{m.name}</h2>
                <ul className="work text --medium">
                  {m.work.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
                {m.portfolio && (
                  <a href={m.portfolio} target="_blank" rel="noopener noreferrer" className="link --small portfolio">
                    <span className="t">
                      View portfolio
                      <span className="underline" aria-hidden />
                    </span>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="actions team-back">
          <Link href="/" className="link">
            <span className="t">
              Back to Skylark
              <span className="underline" aria-hidden />
            </span>
          </Link>
        </div>
      </section>
      <PageMotion />
    </>
  );
}
