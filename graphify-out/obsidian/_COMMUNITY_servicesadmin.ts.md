---
type: community
cohesion: 0.08
members: 57
---

# services/admin.ts

**Cohesion:** 0.08 - loosely connected
**Members:** 57 nodes

## Members
- [[DECISION_COPY]] - code - src/lib/services/admin.ts
- [[EnqueueInput]] - code - src/lib/pipeline/queue.ts
- [[GET()_11]] - code - src/app/api/cron/worker/route.ts
- [[HANDLERS]] - code - src/lib/pipeline/worker.ts
- [[Handler]] - code - src/lib/pipeline/worker.ts
- [[Kind]] - code - src/lib/services/notifications.ts
- [[Level]] - code - src/lib/infra/logger.ts
- [[MatchContext]] - code - src/lib/services/matching/engine.ts
- [[ORDER]] - code - src/lib/infra/logger.ts
- [[PREF]] - code - src/lib/services/notifications.ts
- [[RetryOptions]] - code - src/lib/infra/retry.ts
- [[STATUS_FILTERS]] - code - src/lib/services/admin.ts
- [[STORE_THRESHOLD]] - code - src/lib/services/matching/service.ts
- [[aiindex.ts]] - code - src/lib/ai/index.ts
- [[authorized()]] - code - src/app/api/cron/worker/route.ts
- [[backoffMs()]] - code - src/lib/infra/retry.ts
- [[candidateDetail()]] - code - src/lib/services/admin.ts
- [[companyKey()]] - code - src/lib/pipeline/normalize.ts
- [[contextFor()]] - code - src/lib/services/matching/service.ts
- [[emit()]] - code - src/lib/infra/logger.ts
- [[enabledSources()]] - code - src/lib/pipeline/sources.ts
- [[enqueue()]] - code - src/lib/pipeline/queue.ts
- [[enqueueAndKick()]] - code - src/lib/pipeline/queue.ts
- [[fallback]] - code - src/lib/ai/index.ts
- [[getAIProvider()]] - code - src/lib/ai/index.ts
- [[getSource()]] - code - src/lib/pipeline/sources.ts
- [[ingest.ts]] - code - src/lib/pipeline/ingest.ts
- [[jobsCatalog()]] - code - src/lib/services/admin.ts
- [[logger]] - code - src/lib/infra/logger.ts
- [[logger.ts]] - code - src/lib/infra/logger.ts
- [[matchCandidate()]] - code - src/lib/services/matching/service.ts
- [[matchJobs()]] - code - src/lib/services/matching/service.ts
- [[matchable()]] - code - src/lib/services/matching/service.ts
- [[maxDuration]] - code - src/app/api/cron/worker/route.ts
- [[notifications.ts]] - code - src/lib/services/notifications.ts
- [[notify()]] - code - src/lib/services/notifications.ts
- [[pipelineState()]] - code - src/lib/services/admin.ts
- [[queue.ts]] - code - src/lib/pipeline/queue.ts
- [[rematchNow()]] - code - src/lib/services/profile.ts
- [[resolveGithub()]] - code - src/lib/services/verification.ts
- [[retry.ts]] - code - src/lib/infra/retry.ts
- [[retryBackgroundJob()]] - code - src/lib/services/admin.ts
- [[runIngestion()]] - code - src/lib/pipeline/ingest.ts
- [[runOne()]] - code - src/lib/pipeline/worker.ts
- [[runWorker()]] - code - src/lib/pipeline/worker.ts
- [[scoreAll()]] - code - src/lib/services/matching/service.ts
- [[scrub()]] - code - src/lib/infra/logger.ts
- [[service.ts]] - code - src/lib/services/matching/service.ts
- [[servicesadmin.ts]] - code - src/lib/services/admin.ts
- [[sleep()]] - code - src/lib/infra/retry.ts
- [[str()]] - code - src/lib/pipeline/worker.ts
- [[systemHealth()]] - code - src/lib/services/admin.ts
- [[triggerIngestion()]] - code - src/lib/services/admin.ts
- [[withFallback()]] - code - src/lib/ai/index.ts
- [[withRetry()]] - code - src/lib/infra/retry.ts
- [[worker.ts]] - code - src/lib/pipeline/worker.ts
- [[workerroute.ts]] - code - src/app/api/cron/worker/route.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/services/admints
SORT file.name ASC
```

## Connections to other communities
- 56 edges to [[_COMMUNITY_systemRepo]]
- 33 edges to [[_COMMUNITY_dal.ts]]
- 20 edges to [[_COMMUNITY_ServerEnv]]
- 14 edges to [[_COMMUNITY_engine.ts]]
- 12 edges to [[_COMMUNITY_sources.ts]]
- 12 edges to [[_COMMUNITY_servicesprofile.ts]]
- 11 edges to [[_COMMUNITY_dashboardpage.tsx]]
- 11 edges to [[_COMMUNITY_verification.ts]]
- 10 edges to [[_COMMUNITY_domaintypes.ts]]
- 8 edges to [[_COMMUNITY_normalize.ts]]
- 7 edges to [[_COMMUNITY_repository.ts]]
- 7 edges to [[_COMMUNITY_next]]
- 7 edges to [[_COMMUNITY_Button]]
- 6 edges to [[_COMMUNITY_adminjobspage.tsx]]
- 5 edges to [[_COMMUNITY_delivery.ts]]
- 4 edges to [[_COMMUNITY_jobsidpage.tsx]]
- 3 edges to [[_COMMUNITY_constants.ts]]
- 2 edges to [[_COMMUNITY_dataset.ts]]
- 2 edges to [[_COMMUNITY_validation.test.ts]]
- 2 edges to [[_COMMUNITY_adminpage.tsx]]
- 2 edges to [[_COMMUNITY_verify.ts]]
- 2 edges to [[_COMMUNITY_schemas.ts]]
- 2 edges to [[_COMMUNITY_pricing-table.tsx]]

## Top bridge nodes
- [[servicesadmin.ts]] - degree 68, connects to 17 communities
- [[ingest.ts]] - degree 26, connects to 8 communities
- [[logger.ts]] - degree 25, connects to 8 communities
- [[service.ts]] - degree 23, connects to 8 communities
- [[logger]] - degree 21, connects to 8 communities