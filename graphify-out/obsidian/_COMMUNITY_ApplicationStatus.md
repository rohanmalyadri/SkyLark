---
type: community
cohesion: 0.18
members: 12
---

# ApplicationStatus

**Cohesion:** 0.18 - loosely connected
**Members:** 12 nodes

## Members
- [[dot-adminStats()_2]] - code - src/lib/data/supabase.ts
- [[dot-createApplication()_2]] - code - src/lib/data/supabase.ts
- [[dot-getApplication()_2]] - code - src/lib/data/supabase.ts
- [[dot-getApplicationForJob()_2]] - code - src/lib/data/supabase.ts
- [[dot-listAllApplications()_2]] - code - src/lib/data/supabase.ts
- [[dot-listApplications()_2]] - code - src/lib/data/supabase.ts
- [[dot-updateApplication()_2]] - code - src/lib/data/supabase.ts
- [[AdminStats]] - code - src/lib/data/repository.ts
- [[ApplicationStatus]] - code - src/lib/domain/types.ts
- [[fromApplicationPatch()]] - code - src/lib/data/supabase.ts
- [[toAppWithJob()]] - code - src/lib/data/supabase.ts
- [[toApplication()]] - code - src/lib/data/supabase.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/ApplicationStatus
SORT file.name ASC
```

## Connections to other communities
- 7 edges to [[_COMMUNITY_SupabaseRepository]]
- 6 edges to [[_COMMUNITY_supabase.ts]]
- 6 edges to [[_COMMUNITY_check]]
- 5 edges to [[_COMMUNITY_repository.ts]]
- 3 edges to [[_COMMUNITY_Repository]]
- 1 edge to [[_COMMUNITY_HumanReview]]
- 1 edge to [[_COMMUNITY_jobsidpage.tsx]]
- 1 edge to [[_COMMUNITY_candidate.ts]]
- 1 edge to [[_COMMUNITY_cn]]
- 1 edge to [[_COMMUNITY_constants.ts]]
- 1 edge to [[_COMMUNITY_dataset.ts]]
- 1 edge to [[_COMMUNITY_systemRepo]]
- 1 edge to [[_COMMUNITY_engine.ts]]
- 1 edge to [[_COMMUNITY_dashboardpage.tsx]]
- 1 edge to [[_COMMUNITY_MemoryRepository]]
- 1 edge to [[_COMMUNITY_domaintypes.ts]]
- 1 edge to [[_COMMUNITY_toReview]]

## Top bridge nodes
- [[ApplicationStatus]] - degree 17, connects to 14 communities
- [[dot-createApplication()_2]] - degree 5, connects to 3 communities
- [[dot-updateApplication()_2]] - degree 5, connects to 3 communities
- [[toAppWithJob()]] - degree 7, connects to 2 communities
- [[AdminStats]] - degree 6, connects to 2 communities