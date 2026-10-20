---
type: community
cohesion: 0.09
members: 56
---

# ServerEnv

**Cohesion:** 0.09 - loosely connected
**Members:** 56 nodes

## Members
- [[AuthState]] - code - src/app/actions/auth.ts
- [[DEMO_SESSION_COOKIE]] - code - src/lib/auth/demo-session.ts
- [[GET()_12]] - code - src/app/api/health/route.ts
- [[GET()_13]] - code - src/app/auth/callback/route.ts
- [[GET()_14]] - code - src/app/auth/google/callback/route.ts
- [[GET()_15]] - code - src/app/auth/google/route.ts
- [[GET()_16]] - code - src/app/auth/reset/route.ts
- [[GOOGLE_STATE_COOKIE]] - code - src/lib/auth/google.ts
- [[GOOGLE_STATE_TTL_SECONDS]] - code - src/lib/auth/google.ts
- [[GoogleProfile]] - code - src/lib/auth/google.ts
- [[OAuthState]] - code - src/lib/auth/google.ts
- [[ServerEnv]] - code - src/lib/env.ts
- [[ServerEnvSchema]] - code - src/lib/env.ts
- [[actionsauth.ts]] - code - src/app/actions/auth.ts
- [[applyRoleAllowlist()]] - code - src/lib/services/auth.ts
- [[authcallbackroute.ts]] - code - src/app/auth/callback/route.ts
- [[b64url()]] - code - src/lib/auth/google.ts
- [[completeGoogleExchange()]] - code - src/lib/auth/google.ts
- [[completeGoogleSignIn()]] - code - src/lib/services/auth.ts
- [[createSessionClient()]] - code - src/lib/supabase/server.ts
- [[csv]] - code - src/lib/env.ts
- [[demoAction()]] - code - src/app/actions/auth.ts
- [[demoSignIn()_1]] - code - src/lib/services/auth.ts
- [[emailProblem()]] - code - src/lib/validation/email.ts
- [[env.ts]] - code - src/lib/env.ts
- [[exchangeOAuthCode()]] - code - src/lib/services/auth.ts
- [[fieldErrors()]] - code - src/lib/infra/errors.ts
- [[getCurrentUser]] - code - src/lib/auth/dal.ts
- [[getSessionUserId]] - code - src/lib/auth/dal.ts
- [[google.ts]] - code - src/lib/auth/google.ts
- [[googlecallbackroute.ts]] - code - src/app/auth/google/callback/route.ts
- [[googleroute.ts]] - code - src/app/auth/google/route.ts
- [[googleAction()]] - code - src/app/actions/auth.ts
- [[googleRedirectUri()]] - code - src/lib/auth/google.ts
- [[googleSignInUrl()]] - code - src/lib/services/auth.ts
- [[hashPassword()]] - code - src/lib/auth/passwords.ts
- [[healthroute.ts]] - code - src/app/api/health/route.ts
- [[jwks]] - code - src/lib/auth/google.ts
- [[nativeGoogleEnabled()]] - code - src/lib/env.ts
- [[optionalKey]] - code - src/lib/env.ts
- [[passwords.ts]] - code - src/lib/auth/passwords.ts
- [[readGoogleState()]] - code - src/lib/auth/google.ts
- [[ref_node_util]] - concept
- [[resetroute.ts]] - code - src/app/auth/reset/route.ts
- [[safeNext()]] - code - src/app/actions/auth.ts
- [[safeNext()_1]] - code - src/app/auth/google/route.ts
- [[scrypt]] - code - src/lib/auth/passwords.ts
- [[servicesauth.ts]] - code - src/lib/services/auth.ts
- [[setDemoCookie()]] - code - src/lib/services/auth.ts
- [[sign()_1]] - code - src/lib/auth/google.ts
- [[signIn()]] - code - src/lib/services/auth.ts
- [[signInAction()]] - code - src/app/actions/auth.ts
- [[signOut()]] - code - src/lib/services/auth.ts
- [[signUp()_2]] - code - src/lib/services/auth.ts
- [[startGoogleSignIn()]] - code - src/lib/auth/google.ts
- [[verifyPassword()]] - code - src/lib/auth/passwords.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/ServerEnv
SORT file.name ASC
```

## Connections to other communities
- 49 edges to [[_COMMUNITY_dal.ts]]
- 30 edges to [[_COMMUNITY_systemRepo]]
- 20 edges to [[_COMMUNITY_servicesadmin.ts]]
- 14 edges to [[_COMMUNITY_servicesprofile.ts]]
- 10 edges to [[_COMMUNITY_demo-session.ts]]
- 8 edges to [[_COMMUNITY_verification.ts]]
- 7 edges to [[_COMMUNITY_next]]
- 6 edges to [[_COMMUNITY_auth-forms.tsx]]
- 6 edges to [[_COMMUNITY_sources.ts]]
- 5 edges to [[_COMMUNITY_verify.ts]]
- 5 edges to [[_COMMUNITY_email.ts]]
- 5 edges to [[_COMMUNITY_dataset.ts]]
- 5 edges to [[_COMMUNITY_Skeleton]]
- 4 edges to [[_COMMUNITY_app-shell.tsx]]
- 3 edges to [[_COMMUNITY_cn]]
- 2 edges to [[_COMMUNITY_marks.tsx]]
- 2 edges to [[_COMMUNITY_Panel]]
- 2 edges to [[_COMMUNITY_schemas.ts]]
- 1 edge to [[_COMMUNITY_geo.ts]]
- 1 edge to [[_COMMUNITY_repository.ts]]
- 1 edge to [[_COMMUNITY_domaintypes.ts]]
- 1 edge to [[_COMMUNITY_package.json]]
- 1 edge to [[_COMMUNITY_validation.test.ts]]

## Top bridge nodes
- [[servicesauth.ts]] - degree 50, connects to 11 communities
- [[env.ts]] - degree 35, connects to 11 communities
- [[ServerEnv]] - degree 58, connects to 8 communities
- [[actionsauth.ts]] - degree 22, connects to 5 communities
- [[fieldErrors()]] - degree 9, connects to 5 communities