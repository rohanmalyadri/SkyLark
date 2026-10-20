---
type: community
cohesion: 0.40
members: 5
---

# .upsertProfile

**Cohesion:** 0.40 - moderately connected
**Members:** 5 nodes

## Members
- [[dot-getProfile()_2]] - code - src/lib/data/supabase.ts
- [[dot-listProfiles()_2]] - code - src/lib/data/supabase.ts
- [[dot-upsertProfile()_2]] - code - src/lib/data/supabase.ts
- [[fromProfile()]] - code - src/lib/data/supabase.ts
- [[toProfile()]] - code - src/lib/data/supabase.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/upsertProfile
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_SupabaseRepository]]
- 3 edges to [[_COMMUNITY_check]]
- 2 edges to [[_COMMUNITY_supabase.ts]]
- 1 edge to [[_COMMUNITY_dataset.ts]]
- 1 edge to [[_COMMUNITY_seed.ts]]

## Top bridge nodes
- [[dot-upsertProfile()_2]] - degree 6, connects to 4 communities
- [[dot-getProfile()_2]] - degree 3, connects to 2 communities
- [[dot-listProfiles()_2]] - degree 3, connects to 2 communities
- [[toProfile()]] - degree 4, connects to 1 community
- [[fromProfile()]] - degree 2, connects to 1 community