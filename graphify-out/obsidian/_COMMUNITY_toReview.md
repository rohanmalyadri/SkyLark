---
type: community
cohesion: 0.33
members: 6
---

# toReview

**Cohesion:** 0.33 - loosely connected
**Members:** 6 nodes

## Members
- [[dot-createReview()_2]] - code - src/lib/data/supabase.ts
- [[dot-getReview()_2]] - code - src/lib/data/supabase.ts
- [[dot-getReviewForApplication()_2]] - code - src/lib/data/supabase.ts
- [[dot-toReviewContext()]] - code - src/lib/data/supabase.ts
- [[dot-updateReview()_2]] - code - src/lib/data/supabase.ts
- [[toReview()]] - code - src/lib/data/supabase.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/toReview
SORT file.name ASC
```

## Connections to other communities
- 5 edges to [[_COMMUNITY_SupabaseRepository]]
- 4 edges to [[_COMMUNITY_check]]
- 2 edges to [[_COMMUNITY_Repository]]
- 1 edge to [[_COMMUNITY_ApplicationStatus]]
- 1 edge to [[_COMMUNITY_supabase.ts]]

## Top bridge nodes
- [[dot-createReview()_2]] - degree 4, connects to 3 communities
- [[dot-updateReview()_2]] - degree 4, connects to 3 communities
- [[dot-toReviewContext()]] - degree 4, connects to 2 communities
- [[dot-getReview()_2]] - degree 3, connects to 2 communities
- [[dot-getReviewForApplication()_2]] - degree 3, connects to 2 communities