---
type: community
cohesion: 0.14
members: 15
---

# seed.ts

**Cohesion:** 0.14 - loosely connected
**Members:** 15 nodes

## Members
- [[dot-getSubscription()_2]] - code - src/lib/data/supabase.ts
- [[dot-getVerification()_2]] - code - src/lib/data/supabase.ts
- [[dot-listVerifications()_2]] - code - src/lib/data/supabase.ts
- [[dot-upsertMatches()_2]] - code - src/lib/data/supabase.ts
- [[dot-upsertSubscription()_2]] - code - src/lib/data/supabase.ts
- [[dot-upsertVerification()_2]] - code - src/lib/data/supabase.ts
- [[@supabasesupabase-js_1]] - concept - package.json
- [[admin]] - code - scripts/seed.ts
- [[dotenv_1]] - concept - package.json
- [[existingAuthUsers()]] - code - scripts/seed.ts
- [[main()]] - code - scripts/seed.ts
- [[repo]] - code - scripts/seed.ts
- [[seed.ts]] - code - scripts/seed.ts
- [[toSubscription()]] - code - src/lib/data/supabase.ts
- [[toVerification()]] - code - src/lib/data/supabase.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/seedts
SORT file.name ASC
```

## Connections to other communities
- 7 edges to [[_COMMUNITY_SupabaseRepository]]
- 7 edges to [[_COMMUNITY_supabase.ts]]
- 6 edges to [[_COMMUNITY_check]]
- 4 edges to [[_COMMUNITY_Repository]]
- 3 edges to [[_COMMUNITY_dataset.ts]]
- 2 edges to [[_COMMUNITY_package.json]]
- 1 edge to [[_COMMUNITY_dot-upsertProfile]]
- 1 edge to [[_COMMUNITY_dal.ts]]

## Top bridge nodes
- [[seed.ts]] - degree 10, connects to 3 communities
- [[main()]] - degree 10, connects to 3 communities
- [[dot-upsertSubscription()_2]] - degree 5, connects to 3 communities
- [[dot-upsertVerification()_2]] - degree 5, connects to 3 communities
- [[@supabasesupabase-js_1]] - degree 4, connects to 3 communities