---
type: community
cohesion: 0.10
members: 44
---

# dataset.ts

**Cohesion:** 0.10 - loosely connected
**Members:** 44 nodes

## Members
- [[dot-getProfile()_1]] - code - src/lib/data/repository.ts
- [[dot-listCompanies()_1]] - code - src/lib/data/repository.ts
- [[dot-listProfiles()_1]] - code - src/lib/data/repository.ts
- [[dot-listUsers()_1]] - code - src/lib/data/repository.ts
- [[dot-upsertCompany()_1]] - code - src/lib/data/repository.ts
- [[dot-upsertProfile()_1]] - code - src/lib/data/repository.ts
- [[COMPANIES]] - code - src/lib/seed/catalog.ts
- [[COMPANY_SEEDS]] - code - src/lib/seed/catalog.ts
- [[CandidateProfile]] - code - src/lib/domain/types.ts
- [[Company]] - code - src/lib/domain/types.ts
- [[CompanySeed]] - code - src/lib/seed/catalog.ts
- [[DEMO_ADMIN_KEY]] - code - src/lib/seed/people.ts
- [[DEMO_CANDIDATE_KEY]] - code - src/lib/seed/people.ts
- [[DEMO_OPERATOR_KEY]] - code - src/lib/seed/people.ts
- [[JOB_SEEDS]] - code - src/lib/seed/catalog.ts
- [[JobFilters]] - code - src/lib/services/jobs.ts
- [[JobSeed]] - code - src/lib/seed/catalog.ts
- [[LiteProfile]] - code - src/lib/seed/people.ts
- [[OTHERS]] - code - src/lib/seed/people.ts
- [[PEOPLE]] - code - src/lib/seed/people.ts
- [[PLANS]] - code - src/lib/seed/catalog.ts
- [[PersonSeed]] - code - src/lib/seed/people.ts
- [[ROLE_TEMPLATES]] - code - src/lib/seed/catalog.ts
- [[Role]] - code - src/lib/domain/types.ts
- [[SAMPLE_SOURCE]] - code - src/lib/pipeline/source-meta.ts
- [[STATUS_STAGE]] - code - src/lib/seed/dataset.ts
- [[Seniority]] - code - src/lib/domain/types.ts
- [[SponsorshipPolicy]] - code - src/lib/domain/types.ts
- [[WorkMode]] - code - src/lib/domain/types.ts
- [[buildDataset()]] - code - src/lib/seed/dataset.ts
- [[companyIdByKey()]] - code - src/lib/seed/catalog.ts
- [[dataset.ts]] - code - src/lib/seed/dataset.ts
- [[daysAgo()]] - code - src/lib/seed/ids.ts
- [[daysFromNow()]] - code - src/lib/seed/ids.ts
- [[demoProfile()]] - code - src/lib/seed/people.ts
- [[hoursAgo()]] - code - src/lib/seed/ids.ts
- [[ids.ts]] - code - src/lib/seed/ids.ts
- [[jobIdByKey()]] - code - src/lib/seed/catalog.ts
- [[otherProfiles()]] - code - src/lib/seed/people.ts
- [[people.ts]] - code - src/lib/seed/people.ts
- [[seedcatalog.ts]] - code - src/lib/seed/catalog.ts
- [[seedId()]] - code - src/lib/seed/ids.ts
- [[sk()]] - code - src/lib/seed/people.ts
- [[userIdByKey()]] - code - src/lib/seed/people.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/datasetts
SORT file.name ASC
```

## Connections to other communities
- 17 edges to [[_COMMUNITY_repository.ts]]
- 16 edges to [[_COMMUNITY_engine.ts]]
- 15 edges to [[_COMMUNITY_Repository]]
- 12 edges to [[_COMMUNITY_domaintypes.ts]]
- 8 edges to [[_COMMUNITY_delivery.ts]]
- 6 edges to [[_COMMUNITY_normalize.ts]]
- 5 edges to [[_COMMUNITY_supabase.ts]]
- 5 edges to [[_COMMUNITY_dashboardpage.tsx]]
- 5 edges to [[_COMMUNITY_ServerEnv]]
- 3 edges to [[_COMMUNITY_fields.tsx]]
- 3 edges to [[_COMMUNITY_constants.ts]]
- 3 edges to [[_COMMUNITY_HumanReview]]
- 3 edges to [[_COMMUNITY_seed.ts]]
- 2 edges to [[_COMMUNITY_servicesadmin.ts]]
- 2 edges to [[_COMMUNITY_servicesprofile.ts]]
- 2 edges to [[_COMMUNITY_verification.ts]]
- 2 edges to [[_COMMUNITY_dal.ts]]
- 2 edges to [[_COMMUNITY_MemoryRepository]]
- 2 edges to [[_COMMUNITY_(marketing)page.tsx]]
- 1 edge to [[_COMMUNITY_dot-upsertProfile]]
- 1 edge to [[_COMMUNITY_useAction]]
- 1 edge to [[_COMMUNITY_ApplicationStatus]]
- 1 edge to [[_COMMUNITY_SkillRequest]]
- 1 edge to [[_COMMUNITY_emptySelfIdentification]]
- 1 edge to [[_COMMUNITY_systemRepo]]

## Top bridge nodes
- [[dataset.ts]] - degree 77, connects to 17 communities
- [[CandidateProfile]] - degree 23, connects to 9 communities
- [[buildDataset()]] - degree 19, connects to 7 communities
- [[Company]] - degree 11, connects to 5 communities
- [[Seniority]] - degree 9, connects to 4 communities