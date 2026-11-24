// Builds every vector asset into ../assets. Run: npm install && npm run build [name]
import { buildHero } from "./scenes/hero.mjs";
import { buildBrand, buildFooter, buildDivider } from "./scenes/brand.mjs";
import { buildArchitecture } from "./scenes/architecture.mjs";
import { buildPipeline } from "./scenes/pipeline.mjs";
import { buildMatching } from "./scenes/matching.mjs";
import { buildJourney } from "./scenes/journey.mjs";
import { buildFeatures } from "./scenes/features.mjs";
const only = process.argv[2];
const jobs = { brand: buildBrand, hero: buildHero, footer: buildFooter, divider: buildDivider, architecture: buildArchitecture, pipeline: buildPipeline, matching: buildMatching, journey: buildJourney, features: buildFeatures };
for (const [name, fn] of Object.entries(jobs)) if (!only || only === name) await fn();
