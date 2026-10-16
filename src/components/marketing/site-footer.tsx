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
            <a href="https://github.com/rohzyy/AutoApply" target="_blank" rel="noreferrer" aria-label="Skylark on GitHub">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
            </a>
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
