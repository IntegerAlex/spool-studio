# Zustand Rollout: Cleanup & Green CI Plan

## Objective
Finish the already-implemented Zustand rollout by fixing the failing lint check, removing dead code, silencing test warnings, and confirming all four quality gates pass.

## Current State (verified 2026-08-21)

The Zustand introduction is **already implemented but uncommitted** on `main`:

- `zustand@^5.0.15` installed (`package.json`, `pnpm-lock.yaml` modified)
- Stores created: `stores/toast-store.ts`, `stores/preview-store.ts`, `stores/kanban-store.ts` (kanban uses `persist` middleware, key `kanban-preferences`)
- `hooks/use-toast.ts` rewritten as compat shim over toast store — all 14 import sites unchanged and working
- Wired: `components/kanban/board.tsx` (kanban store), `components/assets/revision-panel.tsx` + `asset-revisions-section.tsx` (preview store)
- Tests added: `stores/__tests__/stores.test.ts` (9 tests)
- `vitest.config.ts` switched to `vite-tsconfig-paths`; `.kilo/**` excluded from tests
- `src/integrations/r2/__tests__/r2-service.test.ts` updated for private-bucket behavior (`url → null`) — unrelated to Zustand, part of same working tree

### Validation results

| Check | Result |
|---|---|
| `pnpm typecheck` | ✅ Pass |
| `npx vitest run` | ✅ 69/69 pass |
| `npm run build` | ✅ Pass |
| `pnpm lint` | ❌ **3 errors** |

## Issues to Fix

1. **Lint failure** — `stores/__tests__/stores.test.ts` declares duplicate imports:
   - Lines 4–5 import `usePreviewStore` / `useKanbanStore`; lines 13–14 re-import them.
   - Line 6 imports `KanbanWorkflowColumnId` type; oxlint reports it as already declared (duplicate with line 6's own usage context after dedupe).
   - Fix: delete lines 13–14 (the second import block). Keep the single import block at lines 2–7.
2. **Stale duplicate file** — `components/ui/use-toast.ts` is the old pre-Zustand hook copy. Nothing imports it (verified via grep). Delete it.
3. **Dead code** — `components/layout/header.tsx` (395 lines) is never imported anywhere. The active layout is `DashboardShell`. Delete it (user confirmed).
4. **Test noise** — kanban-store `persist` middleware logs "Unable to update item 'kanban-preferences', the given storage is currently unavailable" during node-env tests. Harmless but noisy.
5. **Uncommitted work** — all changes sit uncommitted on `main`.

## Implementation Steps

1. **Fix `stores/__tests__/stores.test.ts`**
   - Remove the duplicated import block (lines 13–14):
     ```ts
     import { usePreviewStore } from "@/stores/preview-store"
     import { useKanbanStore } from "@/stores/kanban-store"
     ```
2. **Delete `components/ui/use-toast.ts`**
3. **Delete `components/layout/header.tsx`**
4. **Silence persist warnings in tests** — pick one:
   - Add a minimal `localStorage` shim to `test-setup.ts` (test env is `"node"`), e.g. an in-memory object implementing `getItem`/`setItem`/`removeItem` assigned to `globalThis.localStorage`; or
   - In `stores/kanban-store.ts`, wrap storage with `createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : undefined))`.
   - Preferred: the `test-setup.ts` shim — keeps production code untouched.
5. **Re-run all gates**: `pnpm lint`, `pnpm typecheck`, `npx vitest run`, `npm run build` — all must pass.

## Out of Scope
- Committing/pushing — only on explicit user request.
- Further state migrations (`queue/page.tsx` upload state, `client-detail.tsx` form state stay local per prior decision).
- Re-implementing search/notifications UI from deleted `header.tsx` into `DashboardShell` (product decision, separate effort).

## Risks
- Deleting `header.tsx` removes reference implementations of header search + notifications dropdown. Mitigation: git history preserves it; grep confirmed zero imports.
- Persist-shim in `test-setup.ts` could mask real storage bugs. Mitigation: shim is test-only; production behavior unchanged.

## Validation
1. `pnpm lint` → exit 0, no errors.
2. `pnpm typecheck` → clean.
3. `npx vitest run` → all tests pass, no persist warnings in stderr.
4. `npm run build` → completes successfully.
