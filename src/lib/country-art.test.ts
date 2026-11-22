import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COUNTRY_ART } from "./country-art";

describe("country art", () => {
  it("lists exactly the tiles in public/art/countries", () => {
    const files = readdirSync(path.join(process.cwd(), "public/art/countries"))
      .filter((f) => f.endsWith(".jpg"))
      .map((f) => f.replace(/\.jpg$/, "").toUpperCase())
      .sort();
    expect([...COUNTRY_ART].sort()).toEqual(files);
  });
});
