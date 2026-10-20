---
type: community
cohesion: 0.20
members: 12
---

# text.ts

**Cohesion:** 0.20 - loosely connected
**Members:** 12 nodes

## Members
- [[ExperienceSchema]] - code - src/lib/domain/schemas.ts
- [[KEYBOARD_ROWS]] - code - src/lib/validation/text.ts
- [[PersonName]] - code - src/lib/domain/schemas.ts
- [[ProfileSchema]] - code - src/lib/domain/schemas.ts
- [[RARE_BIGRAMS]] - code - src/lib/validation/text.ts
- [[TokenVerdict]] - code - src/lib/validation/text.ts
- [[currentMonth()]] - code - src/lib/domain/schemas.ts
- [[implausibleTokens()]] - code - src/lib/validation/text.ts
- [[judgeToken()]] - code - src/lib/validation/text.ts
- [[nameProblem()]] - code - src/lib/validation/text.ts
- [[text.ts]] - code - src/lib/validation/text.ts
- [[tidyName()]] - code - src/lib/validation/text.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/textts
SORT file.name ASC
```

## Connections to other communities
- 8 edges to [[_COMMUNITY_schemas.ts]]
- 5 edges to [[_COMMUNITY_validation.test.ts]]
- 3 edges to [[_COMMUNITY_verify.ts]]
- 3 edges to [[_COMMUNITY_auth-forms.tsx]]
- 3 edges to [[_COMMUNITY_fields.tsx]]
- 2 edges to [[_COMMUNITY_textProblem]]
- 1 edge to [[_COMMUNITY_servicesprofile.ts]]
- 1 edge to [[_COMMUNITY_dal.ts]]

## Top bridge nodes
- [[text.ts]] - degree 17, connects to 7 communities
- [[implausibleTokens()]] - degree 9, connects to 4 communities
- [[nameProblem()]] - degree 7, connects to 3 communities
- [[ProfileSchema]] - degree 4, connects to 3 communities
- [[tidyName()]] - degree 3, connects to 2 communities