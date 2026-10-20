---
type: community
cohesion: 0.18
members: 20
---

# verification.ts

**Cohesion:** 0.18 - loosely connected
**Members:** 20 nodes

## Members
- [[GhRepo]] - code - src/lib/integrations/github.ts
- [[GhUser]] - code - src/lib/integrations/github.ts
- [[GithubEnrichment]] - code - src/lib/domain/types.ts
- [[ProfileInput]] - code - src/lib/domain/schemas.ts
- [[computeFlags()]] - code - src/lib/services/verification.ts
- [[emptyGithub()]] - code - src/lib/services/verification.ts
- [[emptyProfile()]] - code - src/lib/ai/heuristic.ts
- [[fetchGithubProfile()]] - code - src/lib/integrations/github.ts
- [[fetchMock_1]] - code - src/lib/services/verification.test.ts
- [[fold()_1]] - code - src/lib/services/verification.ts
- [[github.ts]] - code - src/lib/integrations/github.ts
- [[headers()]] - code - src/lib/integrations/github.ts
- [[json()_1]] - code - src/lib/services/verification.test.ts
- [[monthsBetween()]] - code - src/lib/services/verification.ts
- [[recordSubmission()_2]] - code - src/lib/services/verification.ts
- [[setup()]] - code - src/lib/services/verification.test.ts
- [[skillsFromRepos()]] - code - src/lib/integrations/github.ts
- [[user()]] - code - src/lib/services/verification.test.ts
- [[verification.test.ts]] - code - src/lib/services/verification.test.ts
- [[verification.ts]] - code - src/lib/services/verification.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/verificationts
SORT file.name ASC
```

## Connections to other communities
- 11 edges to [[_COMMUNITY_servicesadmin.ts]]
- 11 edges to [[_COMMUNITY_dal.ts]]
- 9 edges to [[_COMMUNITY_geo.ts]]
- 8 edges to [[_COMMUNITY_ServerEnv]]
- 8 edges to [[_COMMUNITY_verify.ts]]
- 6 edges to [[_COMMUNITY_domaintypes.ts]]
- 6 edges to [[_COMMUNITY_systemRepo]]
- 4 edges to [[_COMMUNITY_engine.ts]]
- 3 edges to [[_COMMUNITY_sources.ts]]
- 3 edges to [[_COMMUNITY_schemas.ts]]
- 3 edges to [[_COMMUNITY_servicesprofile.ts]]
- 2 edges to [[_COMMUNITY_dataset.ts]]
- 2 edges to [[_COMMUNITY_validation.test.ts]]
- 1 edge to [[_COMMUNITY_constants.ts]]
- 1 edge to [[_COMMUNITY_marks.tsx]]
- 1 edge to [[_COMMUNITY_email.ts]]
- 1 edge to [[_COMMUNITY_vitest]]

## Top bridge nodes
- [[verification.ts]] - degree 46, connects to 13 communities
- [[verification.test.ts]] - degree 25, connects to 11 communities
- [[github.ts]] - degree 18, connects to 5 communities
- [[emptyProfile()]] - degree 7, connects to 5 communities
- [[computeFlags()]] - degree 8, connects to 3 communities