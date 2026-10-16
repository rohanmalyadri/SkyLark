"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface MapLocation {
  key: string;
  city: string;
  country: string;
  roles: number;
  x: number;
  y: number;
}

/** Red markers on the stippled map; hover (desktop) or tap (touch) shows the city card. */
export function MapLocations({ locations }: { locations: MapLocation[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="locations">
      {locations.map((l) => (
        <div
          key={l.key}
          className={cn("location", open === l.key && "--showing", l.x > 70 && "--left")}
          style={{ left: `${l.x}%`, top: `${l.y}%` }}
          onMouseEnter={() => setOpen(l.key)}
          onMouseLeave={() => setOpen((o) => (o === l.key ? null : o))}
        >
          <button type="button" className="dot" aria-label={`${l.city}: ${l.roles} open roles`} aria-expanded={open === l.key} onClick={() => setOpen((o) => (o === l.key ? null : l.key))}>
            <span aria-hidden />
          </button>
          <div className="tooltip" role="tooltip">
            <p className="text --xlarge --bold">{l.city}</p>
            <p className="text --medium">
              {l.roles} open {l.roles === 1 ? "role" : "roles"} · {l.country}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
