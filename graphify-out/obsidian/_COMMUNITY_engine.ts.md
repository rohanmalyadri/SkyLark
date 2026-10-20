---
type: community
cohesion: 0.06
members: 67
---

# engine.ts

**Cohesion:** 0.06 - loosely connected
**Members:** 67 nodes

## Members
- [[dot-constructor()_12]] - code - src/lib/ai/anthropic.ts
- [[dot-extractResume()]] - code - src/lib/ai/anthropic.ts
- [[dot-extractResume()_1]] - code - src/lib/ai/heuristic.ts
- [[dot-extractResume()_2]] - code - src/lib/ai/types.ts
- [[dot-tailor()]] - code - src/lib/ai/anthropic.ts
- [[dot-tailor()_1]] - code - src/lib/ai/heuristic.ts
- [[dot-tailor()_2]] - code - src/lib/ai/types.ts
- [[AIProvider]] - code - src/lib/ai/types.ts
- [[AnthropicProvider]] - code - src/lib/ai/anthropic.ts
- [[BACKEND]] - code - src/lib/ai/heuristic.ts
- [[BulletSuggestion]] - code - src/lib/domain/types.ts
- [[CompletenessItem]] - code - src/lib/domain/profile.ts
- [[DEGREE_RANK]] - code - src/lib/services/matching/engine.ts
- [[DashboardTask]] - code - src/lib/services/dashboard.ts
- [[Eligibility]] - code - src/lib/domain/types.ts
- [[EligibilityResult]] - code - src/lib/services/matching/engine.ts
- [[ExtractionSchema]] - code - src/lib/ai/anthropic.ts
- [[FACTOR_WEIGHTS]] - code - src/lib/services/matching/engine.ts
- [[FRONTEND]] - code - src/lib/ai/heuristic.ts
- [[FX_TO_USD]] - code - src/lib/services/matching/engine.ts
- [[GERUND_PAST]] - code - src/lib/ai/heuristic.ts
- [[HeuristicProvider]] - code - src/lib/ai/heuristic.ts
- [[MatchBreakdown]] - code - src/lib/domain/types.ts
- [[MatchFactor]] - code - src/lib/domain/types.ts
- [[MatchResult]] - code - src/lib/services/matching/engine.ts
- [[REQUIRED_LABEL]] - code - src/lib/services/matching/engine.ts
- [[REQUIRED_RANK]] - code - src/lib/services/matching/engine.ts
- [[ResumeExtraction]] - code - src/lib/ai/types.ts
- [[SENIORITY_RANK]] - code - src/lib/domain/constants.ts
- [[SKILL_FAMILIES]] - code - src/lib/services/matching/engine.ts
- [[Skill]] - code - src/lib/domain/types.ts
- [[SkillAlignment]] - code - src/lib/domain/types.ts
- [[TailoringInput]] - code - src/lib/ai/types.ts
- [[TailoringOutput]] - code - src/lib/ai/types.ts
- [[TailoringSchema]] - code - src/lib/ai/anthropic.ts
- [[aitypes.ts]] - code - src/lib/ai/types.ts
- [[anthropic.ts]] - code - src/lib/ai/anthropic.ts
- [[authorizedCountries()]] - code - src/lib/domain/profile.ts
- [[clamp()]] - code - src/lib/utils.ts
- [[company_1]] - code - src/lib/services/matching/engine.test.ts
- [[dashboard.ts]] - code - src/lib/services/dashboard.ts
- [[dashboardData()]] - code - src/lib/services/dashboard.ts
- [[domainprofile.ts]] - code - src/lib/domain/profile.ts
- [[engine.test.ts]] - code - src/lib/services/matching/engine.test.ts
- [[engine.ts]] - code - src/lib/services/matching/engine.ts
- [[factor()]] - code - src/lib/services/matching/engine.ts
- [[familyOf()]] - code - src/lib/services/matching/engine.ts
- [[heuristic.ts]] - code - src/lib/ai/heuristic.ts
- [[heuristicTailor()]] - code - src/lib/ai/heuristic.ts
- [[job()]] - code - src/lib/services/matching/engine.test.ts
- [[jobCountries()]] - code - src/lib/services/matching/engine.ts
- [[normalizeSkill()]] - code - src/lib/utils.ts
- [[profile()]] - code - src/lib/services/matching/engine.test.ts
- [[profileCompleteness()]] - code - src/lib/domain/profile.ts
- [[rankMatches()]] - code - src/lib/services/matching/engine.ts
- [[rate()]] - code - src/lib/services/matching/engine.ts
- [[relevantSkills()]] - code - src/lib/ai/heuristic.ts
- [[rewriteBullet()]] - code - src/lib/ai/heuristic.ts
- [[scoreEducation()]] - code - src/lib/services/matching/engine.ts
- [[scoreEligibility()]] - code - src/lib/services/matching/engine.ts
- [[scoreExperience()]] - code - src/lib/services/matching/engine.ts
- [[scoreLocation()]] - code - src/lib/services/matching/engine.ts
- [[scoreMatch()]] - code - src/lib/services/matching/engine.ts
- [[scorePreferences()]] - code - src/lib/services/matching/engine.ts
- [[scoreSkills()]] - code - src/lib/services/matching/engine.ts
- [[toUSD()]] - code - src/lib/services/matching/engine.ts
- [[yearsLabel()]] - code - src/lib/ai/heuristic.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/enginets
SORT file.name ASC
```

## Connections to other communities
- 16 edges to [[_COMMUNITY_dataset.ts]]
- 14 edges to [[_COMMUNITY_servicesadmin.ts]]
- 12 edges to [[_COMMUNITY_domaintypes.ts]]
- 10 edges to [[_COMMUNITY_jobsidpage.tsx]]
- 8 edges to [[_COMMUNITY_dashboardpage.tsx]]
- 8 edges to [[_COMMUNITY_normalize.ts]]
- 6 edges to [[_COMMUNITY_systemRepo]]
- 6 edges to [[_COMMUNITY_dal.ts]]
- 5 edges to [[_COMMUNITY_constants.ts]]
- 4 edges to [[_COMMUNITY_repository.ts]]
- 4 edges to [[_COMMUNITY_verification.ts]]
- 4 edges to [[_COMMUNITY_cn]]
- 3 edges to [[_COMMUNITY_profilepage.tsx]]
- 3 edges to [[_COMMUNITY_(marketing)page.tsx]]
- 1 edge to [[_COMMUNITY_candidate.ts]]
- 1 edge to [[_COMMUNITY_fields.tsx]]
- 1 edge to [[_COMMUNITY_ApplicationStatus]]
- 1 edge to [[_COMMUNITY_adminjobspage.tsx]]
- 1 edge to [[_COMMUNITY_servicesprofile.ts]]
- 1 edge to [[_COMMUNITY_package.json]]
- 1 edge to [[_COMMUNITY_vitest]]

## Top bridge nodes
- [[engine.ts]] - degree 48, connects to 11 communities
- [[heuristic.ts]] - degree 32, connects to 10 communities
- [[scoreMatch()]] - degree 17, connects to 5 communities
- [[anthropic.ts]] - degree 14, connects to 5 communities
- [[dashboard.ts]] - degree 13, connects to 5 communities