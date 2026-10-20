---
type: community
cohesion: 0.33
members: 6
---

# emptySelfIdentification

**Cohesion:** 0.33 - loosely connected
**Members:** 6 nodes

## Members
- [[dot-getAnswers()_2]] - code - src/lib/data/supabase.ts
- [[dot-getSelfIdentification()_2]] - code - src/lib/data/supabase.ts
- [[dot-patchAnswerSection()_2]] - code - src/lib/data/supabase.ts
- [[dot-upsertAnswers()_2]] - code - src/lib/data/supabase.ts
- [[emptySelfIdentification()]] - code - src/lib/seed/dataset.ts
- [[toAnswers()]] - code - src/lib/data/supabase.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/emptySelfIdentification
SORT file.name ASC
```

## Connections to other communities
- 4 edges to [[_COMMUNITY_SupabaseRepository]]
- 4 edges to [[_COMMUNITY_check]]
- 4 edges to [[_COMMUNITY_delivery.ts]]
- 3 edges to [[_COMMUNITY_repository.ts]]
- 2 edges to [[_COMMUNITY_MemoryRepository]]
- 2 edges to [[_COMMUNITY_supabase.ts]]
- 1 edge to [[_COMMUNITY_dataset.ts]]

## Top bridge nodes
- [[emptySelfIdentification()]] - degree 11, connects to 5 communities
- [[dot-patchAnswerSection()_2]] - degree 4, connects to 3 communities
- [[dot-upsertAnswers()_2]] - degree 4, connects to 3 communities
- [[dot-getAnswers()_2]] - degree 3, connects to 2 communities
- [[dot-getSelfIdentification()_2]] - degree 3, connects to 2 communities