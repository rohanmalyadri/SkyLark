import { OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "Skylark — Your next move, already in motion";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ eyebrow: "Human-assisted job applications", title: "Your next move, already in motion" });
}
