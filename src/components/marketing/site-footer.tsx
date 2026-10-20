import Image from "next/image";
import Link from "next/link";
import { AutoCarousel } from "./motion";

const TILES = ["/art/land/land-04.jpg", "/art/land/land-09.jpg", "/art/land/land-13.jpg", "/art/land/land-02.jpg", "/art/land/land-07.jpg", "/art/land/land-15.jpg"];

const LINKS = [
  ["How it works", "/#how-it-works"],
  ["Pricing", "/pricing"],
  ["Sign in", "/login"],
  ["Privacy", "/privacy"],
  ["Terms & Conditions", "/terms"],
  ["Operations console", "/admin"],
  ["System status", "/api/health"],
] as const;

export function SiteFooter() {
  return (
    <footer className="footer" id="footer">
      <div className="wrap --full">
        <div className="top">
          <div className="first">
            <div className="text-block-center">
              <h2 className="display --large --fill">Less time applying, more time for the interviews that matter</h2>
              <div className="actions">
                <Link href="/signup" className="link">
                  <span className="t">
                    Get started
                    <span className="underline" aria-hidden />
                  </span>
                </Link>
              </div>
            </div>
            <AutoCarousel>
              <div className="inner" aria-hidden>
                {[...TILES, ...TILES].map((src, i) => (
                  <div key={i} className="image">
                    <Image src={src} alt="" fill sizes="(min-width: 1101px) 10vw, 20vw" />
                  </div>
                ))}
              </div>
            </AutoCarousel>
          </div>
          <div className="social">
          </div>
        </div>
        <hr />
        <div className="bottom">
          <ul className="legal">
            {LINKS.map(([label, href]) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
          <div className="copyright text --xsmall">
            <p>© 2026 Skylark. All rights reserved.</p>
            <p>
              Made with{" "}
              <span className="heart" role="img" aria-label="love">
                ♥
              </span>{" "}
              by <Link href="/team" className="team-link">Team Synapse X</Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
