/**
 * The four stage marks, drawn in the reference's icon grammar: a 160×160 square built from
 * two flat solid forms. They take `currentColor`, so hover can turn them red.
 */
const PATHS: Record<string, string[]> = {
  // Profile: a head above a pair of shoulders
  profile: ["M80 0a40 40 0 1 1 0 80a40 40 0 1 1 0-80Z", "M0 160C0 115.8 35.8 88 80 88s80 27.8 80 72H0Z"],
  // Match: a ring and its bullseye
  match: ["M80 0a80 80 0 1 1 0 160A80 80 0 1 1 80 0Zm0 40a40 40 0 1 0 0 80a40 40 0 1 0 0-80Z", "M80 60a20 20 0 1 1 0 40a20 20 0 1 1 0-40Z"],
  // Tailor: a page with its corner folded back
  tailor: ["M0 0H104V56H160V160H0Z", "M116 0L160 44H116Z"],
  // Apply & track: an arrowhead lifting off its base
  apply: ["M80 0L160 80H0Z", "M44 96H116V160H44Z"],
};

export function StepIcon({ name, className }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden>
      {PATHS[name]!.map((d) => (
        <path key={d} d={d} fill="currentColor" fillRule="evenodd" />
      ))}
    </svg>
  );
}

export type StepIconName = keyof typeof PATHS;
