# Plan: Day Plan System with Smart Recommendations

## Summary
Add a day-level task layer between service cycles and assets: admin assigns daily reel/poster tasks to designers (Mon–Sat, 1 reel = 2 posters, 4 units/day), attaches client references, designers upload against their tasks, and tasks auto-tick on finalize. A deterministic recommendation engine suggests each day's assignments from cycle remaining-work math. No ML/calculation library — plain integer arithmetic suffices (verdict in Notes).

## User Story
As an admin, I want to assign daily content tasks to designers with references attached and get suggested assignments from cycle deadlines, so that designer workload is balanced and every upload traces back to a plan.

## Problem → Solution
Weekly cycle plans exist but there is no daily assignment, tracking, or history → day_plans table + Day tab in Planner + rule-based recommender reusing cycle math.

## Metadata
- **Complexity**: Large
- **Source PRD**: N/A
- **PRD Phase**: N/A (standalone; follows carry-in `already_published_*` columns)
- **Estimated Files**: 17 (2 migrations, 2 schema, 1 repo, 1 service + 1 pure engine, 4 routes, 1 dialog, 1 planner tab, types, api-client, 1-2 tests)

---

## UX Design

### Before
```
Planner page: filter tabs (all/active/upcoming/completed) → client cards →
cycle blocks with weekly Reels/Posters table. No daily view, no assignee,
no references linkage. Uploads happen free-form from asset dialog.
```

### After
```
Planner page: [Cycles | Day Plan] tabs.
Day tab (admin): date picker → designer rows with capacity bars (x/4 units)
  → recommended assignments panel (Accept/Edit) → task cards with status
  chips (pending/in_progress/done) + linked references + result asset link.
Day tab (designer): only my tasks for the date + history date-range.
Asset dialog: optional "Linked day task" picker (defaults to my pending
  tasks for that client); linked references show read-only.
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Planner | cycles only | Cycles + Day tabs | follow tab pattern `planner/page.tsx:164-179` |
| Task create | N/A | dialog like `cycle-form-dialog` (Switch/Inputs precedent) | admin only |
| Upload | free-form | optional task link; finalize ticks task | extend JSON body, not new endpoint |
| References | per-client list | attach to task via existing references API | reuse, don't duplicate |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `src/services/service-cycles-service.ts` | 33-58, 172-208 | plan generation + create pattern to mirror |
| P0 | `src/services/plan-utils.ts` | 45-110 | `distributeDeliverables` + `distributeRemaining` engine precedent |
| P0 | `src/services/asset-uploads.ts` | 102-160 | `finalizeAssetUpload` signature — tick hook goes here or its caller |
| P0 | `app/api/cycles/route.ts` | 28-57 | zod + parseBody + create POST pattern |
| P1 | `app/dashboard/planner/page.tsx` | 56-82, 164-179 | query keys + tab UI to extend |
| P1 | `lib/api-client.ts` | 1230-1309, 545-561 | `cyclesApi` CRUD + spread-hydrate pattern |
| P1 | `app/api/assets/[id]/upload/route.ts` | 88-140 | JSON finalize body — where `dayPlanId` lands |
| P1 | `components/cycles/cycle-form-dialog.tsx` | carry-in toggle block | Switch + conditional inputs + preview precedent |
| P2 | `app/api/clients/[id]/references/route.ts` | 28-60 | reference attach source API |
| P2 | `src/lib/rbac.ts` | 5-30, 60-95 | permission names + role maps |
| P2 | `src/services/__tests__/plan-utils.test.ts` | all | vitest style for engine tests |

## External Documentation
None — no external research needed. Feature uses established internal patterns; the "library?" question is answered below with stdlib-only verdict.

---

## Patterns to Mirror

### NAMING_CONVENTION
// SOURCE: src/db/schema/content-planning.ts:21-36
snake_case columns (`reels_target`, `already_published_reels`), camelCase TS (`reelsTarget`), `Db*` repo types, `mapCycle` row→DTO.

### ERROR_HANDLING
// SOURCE: app/api/cycles/route.ts:28-57 + lib/api-error.ts
`readJsonBody` → zod schema → `parseBody` → service throws `Error("...")` / `ApiError.badRequest` → `jsonError`. Upload finalize failures use 502 with actionable text (upload route precedent).

### LOGGING_PATTERN
// SOURCE: app/api/assets/[id]/upload/route.ts
`console.info("[upload][stage]", {...})` scoped tags. New code logs `[dayplan][...]` tags.

### REPOSITORY_PATTERN
// SOURCE: src/repositories/service-cycles-repository.ts:66-75
Thin wrappers: `insertCycle(payload: DbNewServiceCycle)`, `updateCycle(id, Partial<...>)` — inferred types, no hand-written SQL.

### SERVICE_PATTERN
// SOURCE: src/services/service-cycles-service.ts:172-208
`getOrCreateCurrentUserProfile()` → status logic → `insertCycle` → `generatePlanForCycle` → `mapCycle`. Pure math lives in `plan-utils.ts`, never in service.

### TEST_STRUCTURE
// SOURCE: src/services/__tests__/plan-utils.test.ts
`vitest` + `describe/it` + `toEqual` on pure functions. Engine rules get table-style cases here.

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `src/db/schema/day-plans.ts` (+ index export) | CREATE | `day_plans` table |
| `drizzle/migrations/0009_*.sql` | CREATE via `pnpm db:generate` | migration |
| `src/types/index.ts` | UPDATE | `DayPlan`, `DayPlanTask`, `CreateDayPlanInput`, `DayRecommendation` |
| `src/db/schema/users.ts` | UPDATE | `daily_capacity_units int default 4` (admin-editable) |
| `app/api/users/[id]/route.ts` | UPDATE | PATCH capacity, admin-only (GET exists; add PATCH) |
| `src/repositories/day-plans-repository.ts` | CREATE | thin CRUD + `listByDesignerDate`, `listByDate` |
| `src/services/day-plan-engine.ts` | CREATE | pure recommender (per-designer capacity, priority, poster-day rotation) |
| `src/services/day-plans-service.ts` | CREATE | RBAC-aware CRUD + accept-recommendation |
| `src/services/__tests__/day-plan-engine.test.ts` | CREATE | engine rule coverage |
| `app/api/day-plans/route.ts` | CREATE | GET (scoped list) + POST (admin) |
| `app/api/day-plans/[id]/route.ts` | CREATE | PATCH status/edit + DELETE (admin) |
| `app/api/day-plans/recommendations/route.ts` | CREATE | GET `?date=` admin-only |
| `src/services/asset-uploads.ts` | UPDATE | accept optional `dayPlanId`, mark done on finalize |
| `app/api/assets/[id]/upload/route.ts` | UPDATE | zod `dayPlanId` passthrough |
| `lib/api-client.ts` | UPDATE | `dayPlansApi` mirroring `cyclesApi` |
| `app/dashboard/planner/page.tsx` | UPDATE | Day tab + inline per-designer capacity editor |
| `components/day-plans/*` | CREATE (2 files max: list + dialog) | task UI, reuse Badge/Card/Input/Switch |

## NOT Building
- No ML/scoring library (brain.js, TF.js, OR-tools) — verdict below
- No auto-assignment; recommendations are accept/edit only
- No assignment push notifications (no per-user notify infra beyond mailgun asset mails)
- No Sunday/overtime rules, no per-designer skill weighting (capacity is one number per designer)
- No new references table — reuse `client_references` + `reference_ids uuid[]`

---

## Step-by-Step Tasks

### Task 1: Schema + migration
- **ACTION**: Create `src/db/schema/day-plans.ts`, export from schema index, generate + apply migration
- **IMPLEMENT**: `day_plans(id uuid pk, date date, designer_id uuid, client_id uuid, cycle_id uuid nullable, kind asset_type, qty int default 1, status text default 'pending', reference_ids uuid[] default '{}', result_asset_id uuid nullable, created_by uuid, timestamps)`. `status` as plain text with app-level union (matches `upload_queue.status` precedent, avoids enum migration pain)
- **MIRROR**: SCHEMA pattern `content-planning.ts:21-36`
- **GOTCHA**: drizzle `uuid[]` needs `.array()`; dev server caches env not schema — no restart needed for schema, but run `pnpm db:migrate` after generate
- **VALIDATE**: `pnpm db:generate && pnpm db:migrate`, table visible

### Task 2: Types
- **ACTION**: Add `DayPlanStatus = "pending"|"in_progress"|"done"`, `DayPlan`, `CreateDayPlanInput`, `DayRecommendation{designerId,clientId,cycleId,kind,qty,reason}` to `src/types/index.ts`
- **MIRROR**: `ServiceCycle`/`CreateCycleInput` block `src/types/index.ts:128-168`
- **VALIDATE**: `npx tsc --noEmit`

### Task 3: Engine (pure)
- **ACTION**: Create `src/services/day-plan-engine.ts`
- **IMPLEMENT**: constants `UNITS_PER_REEL=2, UNITS_PER_POSTER=1` stay fixed (definition of a unit); per-designer daily limit comes from `designer.dailyCapacityUnits` (default 4 = 2 reels or 1 reel + 2 posters). `recommendDay({cycles, designers, date})` fills each designer to *their own* limit → greedily reels first, poster-only fill when `remainingReels==0`; emit `reason` strings. All inputs/outputs plain data — no DB imports
- **MIRROR**: `plan-utils.ts` `distributeRemaining` (pure, injectable `today`)
- **GOTCHA**: string date compare `weekEnd >= today` works only for `YYYY-MM-DD` — keep that format everywhere
- **VALIDATE**: new `day-plan-engine.test.ts` cases: behind-first ordering, Sunday → [], over-capacity clamping, poster-only fallback, `1 reel + 2 posters = 4 units` combo

### Task 4: Repository + service
- **ACTION**: `day-plans-repository.ts` (insert/get/update/delete/listByDate/listByDesignerDateRange); `day-plans-service.ts` with role scoping (admin sees all, designer own only via `requireUser`)
- **MIRROR**: SERVICE_PATTERN createCycle; `getOrCreateCurrentUserProfile()`
- **GOTCHA**: designer scoping must happen in service, not just UI (chat harness calls internal API with user session — fails closed)
- **VALIDATE**: `npx tsc --noEmit`

### Task 5: API routes
- **ACTION**: 3 routes per Files table; POST/PATCH zod (`date` string, `qty int 1..4`, `kind` enum reel/poster); recommendations GET validates `date`, loads active cycles + designers, calls engine
- **MIRROR**: ERROR_HANDLING cycles POST; `[cycleId]` PATCH `requirePermission("clients:update")` for admin writes
- **GOTCHA**: `cyclesApi.update` sends `{action:"update", ...input}` — day-plans uses plain REST (no action envelope), keep consistent within new routes
- **VALIDATE**: curl POST/GET with admin + designer cookies; designer cannot list others' (403/empty)

### Task 6: Tick-on-upload
- **ACTION**: `finalizeAssetUpload(assetId, input)` gains optional `dayPlanId`; after success, `updateDayPlan(result task → done, result_asset_id)`; upload route zod adds `dayPlanId uuid optional`
- **MIRROR**: existing `uploadResult` passthrough shape in upload route 125-138
- **GOTCHA**: tick must not fail the upload — wrap in try/catch warn (precedent: thumbnail resolve 111-124 "never blocks the upload")
- **VALIDATE**: upload with task → task done + asset linked; upload without → unchanged

### Task 7: Client + UI
- **ACTION**: `dayPlansApi` in `lib/api-client.ts` (list/create/update/remove/recommendations, spread-hydrate); Planner Day tab with date state + `["dayplans", date]` query; designer rows show capacity bar `assignedUnits/limit` with inline stepper (admin only) PATCHing `daily_capacity_units`; `DayPlanDialog` reusing cycle-form-dialog toggle/input styling; asset dialog optional task picker fed by `dayPlansApi.list(mine, client)`
- **MIRROR**: `cyclesApi` 1260-1305; planner tabs 164-179; dark `#161616` card classes
- **GOTCHA**: `QueryClient` has no refetchOnFocus — invalidate `["dayplans"]` after mutations via `useInvalidateAssetViews`-style helper or direct `invalidateQueries`
- **VALIDATE**: `pnpm dev`, create task as admin → visible to designer → upload ticks → history filter shows it

---

## Testing Strategy

### Unit Tests
| Test | Input | Expected | Edge? |
|---|---|---|---|
| behind-first | 2 cycles, one behind | behind cycle assigned first | no |
| sunday | date Sunday | `[]` | yes |
| capacity | 4-unit designer, 2R+4P demand | exactly 4 units, reason strings | no |
| custom capacity | designer limit 6, same demand | fills to 6, not 4 | yes |
| poster-only | 0 reels remaining | 4 posters | yes |
| over-carry | published > target | 0 tasks | yes |
| units | 1R+2P | 4 units full day | no |

### Edge Cases Checklist
- [ ] Empty active cycles → empty recommendations, not error
- [ ] qty > remaining clamped, never negative
- [ ] Designer deleted → tasks list orphan-safe (nullable join, like assets)
- [ ] Concurrent accept of same recommendation → second POST creates dupes; acceptable v1 (note as ponytail ceiling)
- [ ] Permission denied paths (designer POST → 403)

---

## Validation Commands
```bash
npx tsc --noEmit          # EXPECT: zero errors
npx vitest run            # EXPECT: all pass incl. new engine tests
pnpm db:migrate           # EXPECT: 0009 applied
pnpm dev                  # EXPECT: Day tab works end-to-end
```

### Manual Validation
- [ ] Admin creates task with references → designer sees it + refs
- [ ] Accept recommendation fills designer to ≤4 units
- [ ] Designer uploads linked asset → task done, asset link present
- [ ] History date-range shows past tasks
- [ ] Admin edits designer capacity inline → recommendations refill to new limit same day
- [ ] Designer cannot see/admin-mutate others' tasks

## Acceptance Criteria
- [ ] All tasks done, validations green, tests passing, no type/lint errors
- [ ] No new dependencies in package.json
- [ ] Upload without task behaves exactly as before

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Duplicate tasks on double-accept | Med | Low | idempotency key later; v1 documented |
| Engine suggestions feel dumb at scale | Low | Med | reason strings make logic auditable; ML only with real history data |
| `reference_ids uuid[]` orphan refs | Low | Low | UI filters missing refs; matches codebase logical-join convention |

## Notes
**Library verdict (user's explicit question): no library.** Calculations are integer division/remainder over ≤ hundreds of rows — `Math.floor` + existing `distributeDeliverables` already proved sufficient for the carry-in feature. "Smart" here = priority + capacity rules, fully auditable via `reason` strings (an ML model would be unexplainable and has zero training data — no completion history exists yet). Upgrade trigger, stated now so it isn't relitigated: after 6+ months of day-plan completion rows, fit actual per-designer throughput to *suggest* capacity defaults (admin still approves). That is the only future math dependency worth adding, and it still wouldn't need a library (one average per designer).
```

---

## Output (report)

**File**: `.claude/PRPs/plans/day-plan-system.plan.md` — written below via tool call.
