---
type: community
cohesion: 0.50
members: 4
---

# .listPromoCodes

**Cohesion:** 0.50 - moderately connected
**Members:** 4 nodes

## Members
- [[dot-getPromoCode()_2]] - code - src/lib/data/supabase.ts
- [[dot-listPromoCodes()_2]] - code - src/lib/data/supabase.ts
- [[dot-upsertPromoCode()_2]] - code - src/lib/data/supabase.ts
- [[toPromoCode()]] - code - src/lib/data/supabase.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/listPromoCodes
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_SupabaseRepository]]
- 3 edges to [[_COMMUNITY_check]]
- 2 edges to [[_COMMUNITY_Repository]]
- 1 edge to [[_COMMUNITY_supabase.ts]]

## Top bridge nodes
- [[dot-listPromoCodes()_2]] - degree 4, connects to 3 communities
- [[dot-upsertPromoCode()_2]] - degree 4, connects to 3 communities
- [[dot-getPromoCode()_2]] - degree 3, connects to 2 communities
- [[toPromoCode()]] - degree 4, connects to 1 community