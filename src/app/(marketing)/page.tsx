import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FaqList } from "@/components/marketing/faq";
import { HeroScene } from "@/components/marketing/hero-scene";
import { MapLocations, type MapLocation } from "@/components/marketing/map-locations";
import { Draggable, HomeMotion } from "@/components/marketing/motion";
import { ContactForm } from "@/components/marketing/contact-form";
import { PricingTable } from "@/components/marketing/pricing-table";
import { TrustWall } from "@/components/marketing/trust-wall";
import { allPosts, readingMinutes } from "@/lib/content/posts";
import { formatDate } from "@/lib/utils";
import { countryName, DEFAULT_REVIEW_CHECKLIST, REVIEW_SLA_HOURS } from "@/lib/domain/constants";
import { listCountries } from "@/lib/geo";
import { CITY_COORDS, mapPosition } from "@/lib/geo-cities";
import { FACTOR_WEIGHTS, MATCH_MODEL_VERSION } from "@/lib/services/matching/engine";
import { exchangeRates } from "@/lib/services/fx";
import { publicCatalogStats, publicDomains, publicPlans } from "@/lib/services/public";

export const metadata: Metadata = {
  title: { absolute: "Skylark — Your next move, already in motion" },
};

function TextLink({ href, children, small }: { href: string; children: React.ReactNode; small?: boolean }) {
  return (
    <Link href={href} className={small ? "link --small" : "link"}>
      <span className="t">
        {children}
        <span className="underline" aria-hidden />
      </span>
    </Link>
  );
}

const pct = (w: number) => `${Math.round(w * 100)}%`;
const FACTOR_COUNT = Object.keys(FACTOR_WEIGHTS).length;

const STEPS = [
  {
    id: "step-profile",
    nav: "Profile",
    title: ["Your", "profile"],
    art: "/art/stage-profile-v2.jpg",
    body: "Share your experience, goals and where you can work. Upload your resume once — it powers everything that follows.",
    link: { href: "/signup", label: "Create your profile" },
    details: [
      ["Time", "About 5 minutes"],
      ["Resume", "PDF, DOCX or text"],
      ["File size", "Up to 5 MB"],
      ["Preferences", "Roles · countries · salary"],
    ],
  },
  {
    id: "step-match",
    nav: "Match",
    title: ["Ranked", "matches"],
    art: "/art/stage-match-v2.jpg",
    body: `Every role is scored on ${FACTOR_COUNT} weighted factors, and each score explains itself. Roles you can't legally take are filtered out first.`,
    link: { href: "/#faq", label: "How matching works" },
    details: [
      ["Factors", `${FACTOR_COUNT}, weighted`],
      ["Skills", `${pct(FACTOR_WEIGHTS.skills)} of the score`],
      ["Eligibility", `${pct(FACTOR_WEIGHTS.eligibility)} of the score`],
      ["Model", MATCH_MODEL_VERSION],
    ],
  },
  {
    id: "step-tailor",
    nav: "Tailor",
    title: ["Tailored", "to fit"],
    art: "/art/stage-tailor-v2.jpg",
    body: "Your resume and cover letter are adapted to each role from what you've actually done. You accept or reject every change.",
    link: { href: "/signup", label: "Start tailoring" },
    details: [
      ["Changes", "Approved line by line"],
      ["Cover letter", "Written per role"],
      ["Versions", "Kept for every role"],
      ["Sources", "Only your own history"],
    ],
  },
  {
    id: "step-apply",
    nav: "Apply & track",
    title: ["Applied", "for you"],
    art: "/art/stage-apply-v2.jpg",
    body: "A specialist checks eligibility and accuracy, submits through the employer's own channel, and tracks every reply.",
    link: { href: "/#pricing", label: "See plan allowances" },
    details: [
      ["Review", `${DEFAULT_REVIEW_CHECKLIST.length}-point checklist`],
      ["Turnaround", `${REVIEW_SLA_HOURS}-hour target`],
      ["Updates", "In-app alerts"],
      ["Tracking", "Saved → offer"],
    ],
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Sea of clouds behind the hero and introduction (WebGL, fixed to the viewport) */}
      <div className="canvas" aria-hidden>
        <HeroScene />
      </div>

      {/* 01 — Hero (herofulltext) */}
      <section className="component component--hero" aria-labelledby="hero-title">
        <div className="wrap --full">
          <h1 id="hero-title" className="title display --3xlarge">
            <span className="line">Your</span>
            <span className="line">next</span>
            <span className="line">move</span>
          </h1>
          <div className="text-block-left --small">
            <p className="text --xlarge --rise">Matched roles, tailored applications and specialist review for job seekers applying across borders.</p>
            <div className="actions">
              <TextLink href="/#how-it-works">How it works</TextLink>
            </div>
          </div>
          <p className="label scroll">Scroll</p>
        </div>
      </section>

      {/* 02 — About (textblocklarge) */}
      <section id="about" className="component component--textblocklarge" aria-labelledby="about-title">
        <div className="wrap --full">
          <div className="text-block-center">
            <p className="label">About Skylark</p>
            <h2 id="about-title" className="display --large --fill">
              A human-assisted job application service for candidates whose next role is across a border
            </h2>
          </div>
        </div>
      </section>

      {/* 03 — Numbers (gridnumbers, vertical) */}
      <Numbers />

      {/* 04 — How it works heading */}
      <section id="how-it-works" className="component component--textblocklarge" aria-labelledby="how-title">
        <div className="wrap --full">
          <div className="text-block-center">
            <p className="label">How it works</p>
            <h2 id="how-title" className="display --large --fill">
              Four stages take you from one profile to applications sent on your behalf, with a person checking every step that matters
            </h2>
          </div>
        </div>
      </section>

      {/* 05 — Stages (contentscrollcenter) */}
      <section className="component component--scroll" data-hide-header aria-label="The four stages">
        <div className="stage" style={{ ["--count" as string]: STEPS.length }}>
          <div className="sticky">
            <nav className="anchors" aria-label="Stages">
              {STEPS.map((s, i) => (
                <button key={s.id} type="button" className={i === 0 ? "text --xsmall --bold --active" : "text --xsmall --bold"}>
                  {s.nav}
                </button>
              ))}
            </nav>
            {STEPS.map((s) => (
              <article key={s.id} id={s.id} className="content" aria-labelledby={`${s.id}-title`}>
                <div className="image --cover" data-cursor="View">
                  <Image src={s.art} alt="" fill sizes="100vw" />
                </div>
                <div className="info">
                  <h3 id={`${s.id}-title`} className="title display --3xlarge floating-center">
                    <span className="line">{s.title[0]}</span>
                    <span className="line">{s.title[1]}</span>
                  </h3>
                  <div className="text-block-left --xsmall">
                    <p className="text --medium --bold">{s.body}</p>
                    <div className="actions">
                      <TextLink href={s.link.href} small>
                        {s.link.label}
                      </TextLink>
                    </div>
                  </div>
                  <dl className="details">
                    {s.details.map(([k, v]) => (
                      <div key={k} className="group">
                        <dt className="text --xsmall --uppercase --bold">{k}</dt>
                        <dd className="text --small">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </article>
            ))}
            <div className="svg-container" id="morphings-svg" aria-hidden />
          </div>
        </div>
      </section>

      {/* 06 — International (map) */}
      <International />

      {/* 07 — Disciplines (teams) */}
      <Disciplines />

      {/* 08 — Pricing */}
      <section id="pricing" className="component component--textblocklarge" aria-labelledby="pricing-title">
        <div className="wrap --full">
          <div className="text-block-center">
            <p className="label">Pricing</p>
            <h2 id="pricing-title" className="display --large --fill">
              Plans for every stage of a search, from self-serve matching to a dedicated specialist
            </h2>
          </div>
        </div>
      </section>
      <section className="component component--pricing" aria-label="Plans">
        <Plans />
        <p className="pricing-note text --xsmall">
          Prices in USD. Plans renew automatically at the end of each billing period; cancel from Settings and your plan stays active until the period ends. Skylark does not guarantee interviews, offers or visa sponsorship.
        </p>
      </section>

      {/* Trust wall: checkable commitments rather than quotes */}
      <section id="trust" className="component component--textblocklarge" aria-labelledby="trust-title">
        <div className="wrap --full">
          <div className="text-block-center">
            <p className="label">Why trust us</p>
            <h2 id="trust-title" className="display --large --fill">
              Six promises you can check inside the product, not six testimonials
            </h2>
          </div>
        </div>
      </section>
      <section className="component component--trust" aria-label="Our commitments">
        <TrustWall />
      </section>

      {/* Lead capture */}
      <section id="contact" className="component component--contact" aria-labelledby="contact-title">
        <div className="contact">
          <div className="contact__intro">
            <p className="label">Talk to us</p>
            <h2 id="contact-title" className="display --large --fill">
              Not sure which plan fits, or whether we can apply for your kind of role?
            </h2>
            <p className="text --medium">
              Tell us what you&apos;re looking for and a person will reply within one working day. No sales call unless you ask for one.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* Writing */}
      <section id="writing" className="component component--textblocklarge" aria-labelledby="writing-title">
        <div className="wrap --full">
          <div className="text-block-center">
            <p className="label">Writing</p>
            <h2 id="writing-title" className="display --large --fill">
              Practical notes on looking for work in a country that is not yours yet
            </h2>
          </div>
        </div>
      </section>
      <LatestWriting />

      {/* 09 — FAQ */}
      <section id="faq" className="component component--faq" aria-labelledby="faq-title">
        <div className="text-block-center faq-head">
          <p className="label">FAQs</p>
          <h2 id="faq-title" className="display --large --fill">
            Questions, answered
          </h2>
        </div>
        <FaqList />
      </section>

      <HomeMotion />
    </>
  );
}

async function Numbers() {
  const stats = await publicCatalogStats();
  const columns = [
    [
      [String(FACTOR_COUNT), "Factors behind every match score"],
      [String(DEFAULT_REVIEW_CHECKLIST.length), "Checks before every submission"],
      [`${REVIEW_SLA_HOURS}h`, "Target turnaround for specialist review"],
    ],
    [
      [String(listCountries().length), "Countries and territories in our location data"],
      [String(stats.openRoles), "Open roles in the current job catalog"],
      [String(stats.companies), "Hiring companies in the catalog"],
    ],
  ];
  return (
    <section className="component component--gridnumbers" aria-label="Skylark in numbers">
      <div className="wrap --xsmall">
        <div className="columns">
          <div className="item">
            <div className="text-block-left --small">
              <p className="text --xlarge --rise">
                We find roles you&apos;re eligible for, tailor each application and have a specialist check it before it&apos;s sent — so your time goes to interviews.
              </p>
              <div className="actions">
                <TextLink href="/#how-it-works">See how it works</TextLink>
              </div>
            </div>
          </div>
          <div className="item">
            {columns.map((col, c) => (
              <dl key={c} className={`content content-${c}`}>
                {col.map(([n, label]) => (
                  <div key={label} className="group --magnet">
                    <dt className="text --large --bold">{label}</dt>
                    <dd className="number display --xlarge --serif">{n}</dd>
                  </div>
                ))}
              </dl>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

async function International() {
  const stats = await publicCatalogStats();
  const names = stats.countries.map(countryName);
  // The arc needs a full ring; repeat the catalog's markets until it has one.
  const codes = stats.countries;
  // Each tile is that country's own stippled map (public/art/countries/<iso>.jpg).
  const ring = codes.length ? Array.from({ length: Math.max(12, codes.length) }, (_, i) => codes[i % codes.length]!) : [];
  const step = 360 / Math.max(ring.length, 1);
  const markers: MapLocation[] = stats.cities.flatMap((c) => {
    const at = CITY_COORDS[`${c.city}|${c.country}`];
    return at ? [{ key: `${c.city}|${c.country}`, city: c.city, country: countryName(c.country), roles: c.roles, ...mapPosition(at[0], at[1]) }] : [];
  });
  return (
    <section className="component component--map" aria-labelledby="intl-title">
      <div className="wrap --full">
        <div className="waves" aria-hidden>
          <Image src="/art/waves.png" alt="" fill sizes="100vw" style={{ objectFit: "cover" }} />
        </div>
        <div className="text-block-center">
          <p className="label">International by design</p>
          <h2 id="intl-title" className="display --xlarge --fill">
            Your next role may be <strong>in another country</strong>. Start where you can work
          </h2>
        </div>
        {ring.length > 0 && (
          <div className="circle-container" aria-hidden>
            <div className="circle">
              {ring.map((code, i) => (
                <div key={i} className="circle-item" style={{ transform: `rotate(${i * step - 96}deg) translate(var(--r)) rotate(96deg)` }}>
                  <div className="group">
                    <div className="image">
                      <Image src={`/art/countries/${code.toLowerCase()}.jpg`} alt="" fill sizes="(min-width: 1101px) 10vw, 25vw" />
                    </div>
                    <div className="name">
                      <p className="text --xlarge --bold">{countryName(code)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="gradient" />
            <p className="statement text --xlarge">
              Work authorization, sponsorship history and relocation preferences are checked on every role, with location data for {listCountries().length} countries and territories.
            </p>
          </div>
        )}
        <div className="map">
          <Image src="/art/world-dots.png" alt="" fill sizes="100vw" />
          <MapLocations locations={markers} />
        </div>
        <p className="sr-only">Roles in the current catalog are located in {names.join(", ")}.</p>
      </div>
    </section>
  );
}

async function Disciplines() {
  const domains = await publicDomains();
  if (!domains.length) return null;
  return (
    <section id="domains" className="component component--teams" aria-labelledby="domains-title">
      <div className="wrap --full">
        <div className="text-block-center">
          <p className="label">Domains</p>
          <h2 id="domains-title" className="display --large --fill">
            Matched by discipline, with the skills employers in each one ask for most
          </h2>
        </div>
        <Draggable>
          <ul className="inner">
            {domains.map((d, i) => (
              <li key={d.name}>
                <Link href={`/jobs?q=${encodeURIComponent(d.name.toLowerCase())}`} className="card --magnet" draggable={false}>
                  <span className="gradient" aria-hidden />
                  <span className="gradient --hover" aria-hidden />
                  <span className="group">
                    <span className="text --large">
                      {d.openRoles} open {d.openRoles === 1 ? "role" : "roles"} · {d.skills.slice(0, 3).join(", ")}
                    </span>
                    <span className="title display --xsmall">{d.name}</span>
                  </span>
                  <span className="image" aria-hidden>
                    <Image src={`/art/land/land-${String(((i * 5 + 3) % 16) + 1).padStart(2, "0")}.jpg`} alt="" fill sizes="(min-width: 1101px) 23vw, 78vw" draggable={false} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Draggable>
      </div>
    </section>
  );
}

async function Plans() {
  const [plans, fx] = await Promise.all([publicPlans(), exchangeRates()]);
  return <PricingTable plans={plans} fx={fx} />;
}

/** The three most recent posts, read from the same content source as /blog. */
function LatestWriting() {
  const posts = allPosts().slice(0, 3);
  return (
    <section className="component component--posts" aria-label="Latest writing">
      <div className="posts">
        <div className="posts-grid">
          {posts.map((post) => (
            <article key={post.slug} className="post-card">
              <p className="post-card__meta text --xsmall">
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}</time>
                <span aria-hidden> · </span>
                {readingMinutes(post)} min read
              </p>
              <h3 className="title --medium">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h3>
              <p className="text --small post-card__excerpt">{post.description}</p>
              <Link href={`/blog/${post.slug}`} className="post-card__more text --xsmall">
                Read it <ArrowRight aria-hidden />
              </Link>
            </article>
          ))}
        </div>
        <p className="posts__all text --small">
          <Link href="/blog">Everything we have written</Link>
        </p>
      </div>
    </section>
  );
}
