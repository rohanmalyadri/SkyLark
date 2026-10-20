---
type: community
cohesion: 0.12
members: 35
---

# services/profile.ts

**Cohesion:** 0.12 - loosely connected
**Members:** 35 nodes

## Members
- [[dot-s()]] - code - src/lib/data/memory.ts
- [[ALLOWED_DOCUMENT_TYPES]] - code - src/lib/storage.ts
- [[AVATAR_BUCKET]] - code - src/lib/storage.ts
- [[GET()]] - code - src/app/r/[token]/route.ts
- [[MAX_AVATAR_BYTES]] - code - src/lib/storage.ts
- [[MAX_DOCUMENT_BYTES]] - code - src/lib/storage.ts
- [[REFERRAL_COOKIE]] - code - src/lib/services/referral-cookie.ts
- [[tokenroute.ts]] - code - src/app/r/[token]/route.ts
- [[avatarKey()]] - code - src/lib/storage.ts
- [[clearReferralCookie()]] - code - src/lib/services/referral-cookie.ts
- [[completeOnboarding()]] - code - src/lib/services/profile.ts
- [[createAdminClient()]] - code - src/lib/supabase/admin.ts
- [[deleteAvatar()]] - code - src/lib/services/profile.ts
- [[deleteMyAccount()]] - code - src/lib/services/privacy.ts
- [[deleteResume()]] - code - src/lib/services/profile.ts
- [[extractText()]] - code - src/lib/storage.ts
- [[memoryStore()]] - code - src/lib/data/memory.ts
- [[partnerForLink()]] - code - src/lib/services/partners.ts
- [[putAvatar()]] - code - src/lib/storage.ts
- [[putDocument()]] - code - src/lib/storage.ts
- [[readAvatar()]] - code - src/lib/storage.ts
- [[readDocument()]] - code - src/lib/storage.ts
- [[readReferralCookie()]] - code - src/lib/services/referral-cookie.ts
- [[referral-cookie.ts]] - code - src/lib/services/referral-cookie.ts
- [[removeAvatar()]] - code - src/lib/storage.ts
- [[removeDocument()]] - code - src/lib/storage.ts
- [[servicesprofile.ts]] - code - src/lib/services/profile.ts
- [[setPrimaryResume()]] - code - src/lib/services/profile.ts
- [[setReferralCookie()]] - code - src/lib/services/referral-cookie.ts
- [[sniffDocumentType()]] - code - src/lib/storage.ts
- [[sniffImageType()]] - code - src/lib/storage.ts
- [[storage.ts]] - code - src/lib/storage.ts
- [[unpdf]] - code - unpdf
- [[uploadAvatar()]] - code - src/lib/services/profile.ts
- [[uploadResume()]] - code - src/lib/services/profile.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/services/profilets
SORT file.name ASC
```

## Connections to other communities
- 34 edges to [[_COMMUNITY_systemRepo]]
- 29 edges to [[_COMMUNITY_dal.ts]]
- 14 edges to [[_COMMUNITY_ServerEnv]]
- 12 edges to [[_COMMUNITY_servicesadmin.ts]]
- 3 edges to [[_COMMUNITY_candidate.ts]]
- 3 edges to [[_COMMUNITY_verification.ts]]
- 2 edges to [[_COMMUNITY_dataset.ts]]
- 2 edges to [[_COMMUNITY_repository.ts]]
- 2 edges to [[_COMMUNITY_marks.tsx]]
- 2 edges to [[_COMMUNITY_next]]
- 1 edge to [[_COMMUNITY_MemoryRepository]]
- 1 edge to [[_COMMUNITY_package.json]]
- 1 edge to [[_COMMUNITY_geo.ts]]
- 1 edge to [[_COMMUNITY_domaintypes.ts]]
- 1 edge to [[_COMMUNITY_text.ts]]
- 1 edge to [[_COMMUNITY_profilepage.tsx]]
- 1 edge to [[_COMMUNITY_engine.ts]]
- 1 edge to [[_COMMUNITY_schemas.ts]]

## Top bridge nodes
- [[servicesprofile.ts]] - degree 58, connects to 13 communities
- [[deleteMyAccount()]] - degree 12, connects to 4 communities
- [[storage.ts]] - degree 28, connects to 3 communities
- [[memoryStore()]] - degree 13, connects to 3 communities
- [[uploadResume()]] - degree 9, connects to 3 communities