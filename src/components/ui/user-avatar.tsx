"use client";

import { useState } from "react";
import { cn, initials } from "@/lib/utils";

/** Profile photo (uploaded or from Google) with an initials fallback if it's missing or fails to load. */
export function UserAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = !!src && failed !== src;
  return (
    <span className={cn("relative inline-grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-surface-3 text-[11px] font-semibold text-fg", className)} aria-hidden>
      {showImage ? (
        // Plain <img>: Google photo URLs are already sized, and their CDN rejects requests carrying a referrer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setFailed(src)} draggable={false} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
