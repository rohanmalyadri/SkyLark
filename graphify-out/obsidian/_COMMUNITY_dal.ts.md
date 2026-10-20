---
type: community
cohesion: 0.10
members: 61
---

# dal.ts

**Cohesion:** 0.10 - loosely connected
**Members:** 61 nodes

## Members
- [[ActionResult]] - code - src/lib/infra/errors.ts
- [[Body]] - code - src/app/api/v1/applications/route.ts
- [[Bucket]] - code - src/lib/infra/rate-limit.ts
- [[DecisionSchema]] - code - src/lib/services/skills.ts
- [[ErrorCode]] - code - src/lib/infra/errors.ts
- [[GET()_4]] - code - src/app/api/avatars/[id]/route.ts
- [[GET()_5]] - code - src/app/api/me/export/route.ts
- [[GET()_6]] - code - src/app/api/resumes/[id]/route.ts
- [[GET()_7]] - code - src/app/api/roles/suggest/route.ts
- [[GET()_8]] - code - src/app/api/skills/suggest/route.ts
- [[GET()_9]] - code - src/app/api/v1/applications/route.ts
- [[GET()_10]] - code - src/app/api/v1/matches/route.ts
- [[POST()]] - code - src/app/api/v1/applications/route.ts
- [[RATE_LIMITS]] - code - src/lib/infra/rate-limit.ts
- [[RateLimitRule]] - code - src/lib/infra/rate-limit.ts
- [[RequestSchema]] - code - src/lib/services/skills.ts
- [[STAFF_ROLES]] - code - src/lib/auth/dal.ts
- [[STATUS]] - code - src/lib/infra/errors.ts
- [[User]] - code - src/lib/domain/types.ts
- [[_wrap.ts]] - code - src/app/actions/_wrap.ts
- [[actionspublic.ts]] - code - src/app/actions/public.ts
- [[applicationsroute.ts]] - code - src/app/api/v1/applications/route.ts
- [[approvedSkillNames()]] - code - src/lib/services/skills.ts
- [[audit.ts]] - code - src/lib/services/audit.ts
- [[authorize()]] - code - src/lib/auth/dal.ts
- [[avatarsidroute.ts]] - code - src/app/api/avatars/[id]/route.ts
- [[captureLead()]] - code - src/lib/services/leads.ts
- [[dal.ts]] - code - src/lib/auth/dal.ts
- [[dataindex.ts]] - code - src/lib/data/index.ts
- [[errorResponse()]] - code - src/lib/infra/errors.ts
- [[errors.ts]] - code - src/lib/infra/errors.ts
- [[exportroute.ts]] - code - src/app/api/me/export/route.ts
- [[exportMyData()]] - code - src/lib/services/privacy.ts
- [[fetchMock_2]] - code - src/lib/services/privacy-skills.test.ts
- [[g_1]] - code - src/lib/infra/rate-limit.ts
- [[hitMemory()]] - code - src/lib/infra/rate-limit.ts
- [[isStaff()]] - code - src/lib/auth/dal.ts
- [[json()_2]] - code - src/lib/services/privacy-skills.test.ts
- [[leads.ts]] - code - src/lib/services/leads.ts
- [[matchesroute.ts]] - code - src/app/api/v1/matches/route.ts
- [[memory]] - code - src/lib/data/index.ts
- [[people()]] - code - src/lib/services/privacy-skills.test.ts
- [[privacy-skills.test.ts]] - code - src/lib/services/privacy-skills.test.ts
- [[privacy.ts]] - code - src/lib/services/privacy.ts
- [[rate-limit.ts]] - code - src/lib/infra/rate-limit.ts
- [[rateLimit()]] - code - src/lib/infra/rate-limit.ts
- [[requestIp()]] - code - src/lib/auth/dal.ts
- [[requestSkill()]] - code - src/lib/services/skills.ts
- [[resumesidroute.ts]] - code - src/app/api/resumes/[id]/route.ts
- [[rolessuggestroute.ts]] - code - src/app/api/roles/suggest/route.ts
- [[runPublic()]] - code - src/app/actions/public.ts
- [[saveJob()]] - code - src/lib/services/applications.ts
- [[server-only_1]] - concept - package.json
- [[server.ts]] - code - src/lib/supabase/server.ts
- [[signUpAction()]] - code - src/app/actions/auth.ts
- [[skills.ts]] - code - src/lib/services/skills.ts
- [[skillssuggestroute.ts]] - code - src/app/api/skills/suggest/route.ts
- [[submitLeadAction()]] - code - src/app/actions/public.ts
- [[supabaseadmin.ts]] - code - src/lib/supabase/admin.ts
- [[toActionError()]] - code - src/lib/infra/errors.ts
- [[zod_1]] - concept - package.json

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/dalts
SORT file.name ASC
```

## Connections to other communities
- 96 edges to [[_COMMUNITY_systemRepo]]
- 49 edges to [[_COMMUNITY_ServerEnv]]
- 33 edges to [[_COMMUNITY_servicesadmin.ts]]
- 29 edges to [[_COMMUNITY_servicesprofile.ts]]
- 26 edges to [[_COMMUNITY_next]]
- 21 edges to [[_COMMUNITY_verify.ts]]
- 17 edges to [[_COMMUNITY_delivery.ts]]
- 14 edges to [[_COMMUNITY_dashboardpage.tsx]]
- 12 edges to [[_COMMUNITY_Button]]
- 11 edges to [[_COMMUNITY_verification.ts]]
- 11 edges to [[_COMMUNITY_candidate.ts]]
- 7 edges to [[_COMMUNITY_domaintypes.ts]]
- 6 edges to [[_COMMUNITY_repository.ts]]
- 6 edges to [[_COMMUNITY_Repository]]
- 6 edges to [[_COMMUNITY_engine.ts]]
- 6 edges to [[_COMMUNITY_jobsidpage.tsx]]
- 5 edges to [[_COMMUNITY_app-shell.tsx]]
- 5 edges to [[_COMMUNITY_profilepage.tsx]]
- 4 edges to [[_COMMUNITY_pricing-table.tsx]]
- 4 edges to [[_COMMUNITY_demo-session.ts]]
- 4 edges to [[_COMMUNITY_(marketing)pricingpage.tsx]]
- 4 edges to [[_COMMUNITY_Panel]]
- 4 edges to [[_COMMUNITY_schemas.ts]]
- 3 edges to [[_COMMUNITY_supabase.ts]]
- 3 edges to [[_COMMUNITY_useAction]]
- 2 edges to [[_COMMUNITY_dataset.ts]]
- 2 edges to [[_COMMUNITY_auth-forms.tsx]]
- 2 edges to [[_COMMUNITY_marks.tsx]]
- 2 edges to [[_COMMUNITY_normalize.ts]]
- 2 edges to [[_COMMUNITY_sources.ts]]
- 2 edges to [[_COMMUNITY_constants.ts]]
- 2 edges to [[_COMMUNITY_package.json]]
- 2 edges to [[_COMMUNITY_adminjobspage.tsx]]
- 1 edge to [[_COMMUNITY_SupabaseRepository]]
- 1 edge to [[_COMMUNITY_MemoryRepository]]
- 1 edge to [[_COMMUNITY_SkillRequest]]
- 1 edge to [[_COMMUNITY_geo.ts]]
- 1 edge to [[_COMMUNITY_seed.ts]]
- 1 edge to [[_COMMUNITY_email.ts]]
- 1 edge to [[_COMMUNITY_text.ts]]
- 1 edge to [[_COMMUNITY_vitest]]
- 1 edge to [[_COMMUNITY_adminpage.tsx]]

## Top bridge nodes
- [[dataindex.ts]] - degree 62, connects to 20 communities
- [[dal.ts]] - degree 67, connects to 17 communities
- [[server-only_1]] - degree 47, connects to 17 communities
- [[User]] - degree 32, connects to 14 communities
- [[errors.ts]] - degree 47, connects to 12 communities