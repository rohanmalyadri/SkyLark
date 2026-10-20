---
type: community
cohesion: 0.12
members: 31
---

# normalize.ts

**Cohesion:** 0.12 - loosely connected
**Members:** 31 nodes

## Members
- [[CASE_SENSITIVE]] - code - src/lib/pipeline/normalize.ts
- [[DEGREE_RE]] - code - src/lib/pipeline/normalize-degree.ts
- [[ENTITIES]] - code - src/lib/pipeline/normalize.ts
- [[EXONYMS]] - code - src/lib/pipeline/normalize.ts
- [[GENERIC_ALIASES]] - code - src/lib/pipeline/normalize.ts
- [[NewRow]] - code - src/lib/data/repository.ts
- [[RawPostingSchema]] - code - src/lib/pipeline/normalize.ts
- [[SECTION_PATTERNS]] - code - src/lib/pipeline/normalize.ts
- [[SKIP]] - code - src/lib/pipeline/normalize.ts
- [[Salary]] - code - src/lib/domain/types.ts
- [[TERM_PATTERNS]] - code - src/lib/pipeline/normalize.ts
- [[clip()]] - code - src/lib/pipeline/normalize.ts
- [[decodeEntities()]] - code - src/lib/pipeline/normalize.ts
- [[detectSponsorship()]] - code - src/lib/pipeline/normalize.ts
- [[extractMinYears()]] - code - src/lib/pipeline/normalize.ts
- [[extractSkills()]] - code - src/lib/pipeline/normalize.ts
- [[heuristicExtract()]] - code - src/lib/ai/heuristic.ts
- [[htmlToText()]] - code - src/lib/pipeline/normalize.ts
- [[inferSeniority()]] - code - src/lib/pipeline/normalize.ts
- [[ingest.test.ts]] - code - src/lib/pipeline/ingest.test.ts
- [[jobFingerprint()]] - code - src/lib/pipeline/normalize.ts
- [[normalize-degree.ts]] - code - src/lib/pipeline/normalize-degree.ts
- [[normalize.test.ts]] - code - src/lib/pipeline/normalize.test.ts
- [[normalize.ts]] - code - src/lib/pipeline/normalize.ts
- [[normalizePosting()]] - code - src/lib/pipeline/normalize.ts
- [[normalizeTitle()]] - code - src/lib/pipeline/normalize.ts
- [[page()]] - code - src/lib/pipeline/ingest.test.ts
- [[parseSalary()]] - code - src/lib/pipeline/normalize.ts
- [[posting()]] - code - src/lib/pipeline/ingest.test.ts
- [[requiredDegree()]] - code - src/lib/pipeline/normalize-degree.ts
- [[splitSections()]] - code - src/lib/pipeline/normalize.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/normalizets
SORT file.name ASC
```

## Connections to other communities
- 8 edges to [[_COMMUNITY_servicesadmin.ts]]
- 8 edges to [[_COMMUNITY_engine.ts]]
- 7 edges to [[_COMMUNITY_geo.ts]]
- 6 edges to [[_COMMUNITY_dataset.ts]]
- 4 edges to [[_COMMUNITY_repository.ts]]
- 4 edges to [[_COMMUNITY_domaintypes.ts]]
- 3 edges to [[_COMMUNITY_sources.ts]]
- 2 edges to [[_COMMUNITY_dashboardpage.tsx]]
- 2 edges to [[_COMMUNITY_systemRepo]]
- 2 edges to [[_COMMUNITY_verify.ts]]
- 2 edges to [[_COMMUNITY_dal.ts]]
- 2 edges to [[_COMMUNITY_vitest]]

## Top bridge nodes
- [[normalize.ts]] - degree 47, connects to 10 communities
- [[ingest.test.ts]] - degree 18, connects to 7 communities
- [[normalize-degree.ts]] - degree 7, connects to 3 communities
- [[normalizePosting()]] - degree 17, connects to 2 communities
- [[normalize.test.ts]] - degree 9, connects to 2 communities