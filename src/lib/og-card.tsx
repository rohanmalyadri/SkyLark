import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * The social preview card (WhatsApp, LinkedIn, X, Slack): the Skylark mark, a small label and a
 * large headline on the site's off-white, in the same quiet monochrome as the marketing pages.
 */
export async function ogCard({ eyebrow, title, footer = "www.skylarkgo.in" }: { eyebrow: string; title: string; footer?: string }) {
  const mark = await readFile(join(process.cwd(), "public/brand/skylark-mark.png"));
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;
  const size = title.length > 70 ? 56 : title.length > 40 ? 68 : 84;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "#F4F4F2", color: "#1F1F1F" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 88, height: 88, borderRadius: 20, background: "#2B2B2B" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img>, not next/image */}
            <img src={markSrc} width={58} height={46} alt="" />
          </div>
          <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em", color: "#6B6B6B" }}>skylark</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span style={{ fontSize: 26, textTransform: "uppercase", letterSpacing: "0.12em", color: "#6B6B6B" }}>{eyebrow}</span>
          <span style={{ fontSize: size, lineHeight: 1.05, letterSpacing: "-0.02em", fontWeight: 600, maxWidth: 1000 }}>{title}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#6B6B6B", borderTop: "2px solid #DADAD6", paddingTop: 24 }}>
          <span>Matched roles · Tailored applications · Specialist review</span>
          <span>{footer}</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
