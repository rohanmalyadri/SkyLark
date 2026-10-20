---
type: community
cohesion: 0.17
members: 13
---

# HumanReview

**Cohesion:** 0.17 - loosely connected
**Members:** 13 nodes

## Members
- [[dot-createReview()_1]] - code - src/lib/data/repository.ts
- [[dot-getReview()]] - code - src/lib/data/memory.ts
- [[dot-getReview()_1]] - code - src/lib/data/repository.ts
- [[dot-getReviewForApplication()_1]] - code - src/lib/data/repository.ts
- [[dot-listReviews()_1]] - code - src/lib/data/memory.ts
- [[dot-listReviews()_2]] - code - src/lib/data/repository.ts
- [[dot-reviewContext()]] - code - src/lib/data/memory.ts
- [[dot-updateReview()_1]] - code - src/lib/data/repository.ts
- [[HumanReview]] - code - src/lib/domain/types.ts
- [[HumanReviewWithContext]] - code - src/lib/domain/types.ts
- [[PipelineStage]] - code - src/lib/domain/types.ts
- [[Props]] - code - src/components/app/tailoring/workspace.tsx
- [[ReviewStatus]] - code - src/lib/domain/types.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/HumanReview
SORT file.name ASC
```

## Connections to other communities
- 7 edges to [[_COMMUNITY_Repository]]
- 5 edges to [[_COMMUNITY_MemoryRepository]]
- 5 edges to [[_COMMUNITY_repository.ts]]
- 4 edges to [[_COMMUNITY_candidate.ts]]
- 4 edges to [[_COMMUNITY_domaintypes.ts]]
- 3 edges to [[_COMMUNITY_dataset.ts]]
- 2 edges to [[_COMMUNITY_supabase.ts]]
- 2 edges to [[_COMMUNITY_constants.ts]]
- 1 edge to [[_COMMUNITY_ApplicationStatus]]
- 1 edge to [[_COMMUNITY_Button]]
- 1 edge to [[_COMMUNITY_check]]
- 1 edge to [[_COMMUNITY_jobsidpage.tsx]]
- 1 edge to [[_COMMUNITY_next]]
- 1 edge to [[_COMMUNITY_systemRepo]]

## Top bridge nodes
- [[HumanReview]] - degree 15, connects to 8 communities
- [[ReviewStatus]] - degree 7, connects to 6 communities
- [[PipelineStage]] - degree 6, connects to 5 communities
- [[HumanReviewWithContext]] - degree 9, connects to 3 communities
- [[Props]] - degree 5, connects to 3 communities