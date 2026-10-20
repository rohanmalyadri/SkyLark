---
type: community
cohesion: 0.33
members: 6
---

# SkillRequest

**Cohesion:** 0.33 - loosely connected
**Members:** 6 nodes

## Members
- [[dot-createSkillRequest()_1]] - code - src/lib/data/repository.ts
- [[dot-getSkillRequest()_1]] - code - src/lib/data/repository.ts
- [[dot-listSkillRequests()_1]] - code - src/lib/data/repository.ts
- [[dot-updateSkillRequest()_1]] - code - src/lib/data/repository.ts
- [[SkillRequest]] - code - src/lib/domain/types.ts
- [[SkillRequestStatus]] - code - src/lib/domain/types.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/SkillRequest
SORT file.name ASC
```

## Connections to other communities
- 4 edges to [[_COMMUNITY_Repository]]
- 3 edges to [[_COMMUNITY_repository.ts]]
- 2 edges to [[_COMMUNITY_domaintypes.ts]]
- 1 edge to [[_COMMUNITY_fields.tsx]]
- 1 edge to [[_COMMUNITY_supabase.ts]]
- 1 edge to [[_COMMUNITY_dataset.ts]]
- 1 edge to [[_COMMUNITY_dal.ts]]

## Top bridge nodes
- [[SkillRequest]] - degree 11, connects to 6 communities
- [[SkillRequestStatus]] - degree 3, connects to 2 communities
- [[dot-listSkillRequests()_1]] - degree 3, connects to 1 community
- [[dot-createSkillRequest()_1]] - degree 2, connects to 1 community
- [[dot-getSkillRequest()_1]] - degree 2, connects to 1 community