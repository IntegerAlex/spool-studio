# Zustand State Management Introduction Plan

## Objective
Introduce Zustand as the client-side state management library for the CMS, replacing ad-hoc local state patterns with typed, shareable stores.

## Current State Analysis

### Existing State Management
- **Server state**: SWR (`useQuery`, `useMutation`) — keep as-is. Zustand must NOT replace SWR.
- **Client state**: Scattered `useState` / `useReducer` in ~20+ components.
- **No global state library** currently installed.

### Existing State Management

#### Finding: `components/layout/header.tsx` is dead code
`Header` is exported but **never imported** anywhere in the codebase. The active layout is `DashboardShell` (`components/layout/dashboard-shell.tsx`), which has its own simpler header (sidebar trigger + page title + bell icon). The old Header's search, notifications dropdown, and profile menu are not wired up.

**Implication**: The `ui-store` planned for Header state is unnecessary. Do not migrate `header.tsx`.

### Key Pain Points
1. **Toast system** (`hooks/use-toast.ts`): Custom reducer + listener pattern. 60+ imperative `toast({...})` call sites plus 13 hook-based `const { toast } = useToast()` consumers. Verbose and hard to test.
2. **Preview modal state** (`components/assets/revision-panel.tsx`): `previewItem` + `isPreviewOpen` managed locally. If another component (e.g., asset card, activity section) wants to open the same preview, it cannot.
3. **Kanban preferences** (`components/kanban/board.tsx`): `collapsedColumns` is local. User loses column collapse preference on navigation.
4. **Upload queue UI** (`app/dashboard/queue/page.tsx`): `uploadingAssetIds`, `uploadErrors`, `editing` — page-scoped but complex. Could stay local or move to store if drag-and-drop or progress needs to survive page transitions.

### What Should NOT Move to Zustand
- SWR query cache / server data.
- Pure local UI state with no cross-component consumer (e.g., `isDragging` in queue, `showActions` in kanban card).
- Form state tightly coupled to a single component instance (e.g., `comments-thread.tsx` mention autocomplete state).

---

## Decision: Store Architecture

### Chosen Approach: Multiple domain-specific stores
One store per bounded context. Avoids a single mega-store and keeps selectors narrow.

| Store | Scope | Rationale |
|---|---|---|
| `stores/toast-store.ts` | Global | Replaces custom reducer; toast must be triggerable from anywhere. Preserves both imperative `toast()` and hook `useToast()`. |
| `stores/preview-store.ts` | Global | Preview modal item + open state — shared across asset pages. |
| `stores/kanban-store.ts` | Dashboard | Collapsed column preferences — persisted across sessions via `zustand/middleware` `persist`. |

### Rejected Alternatives
- **Single global store**: Too broad; unrelated features (toast, kanban, preview) would share one namespace.
- **Jotai / Valtio**: Overkill for this codebase; Zustand has the lowest boilerplate and matches the existing functional style.

---

## Step-by-Step Implementation

### Step 1: Install Zustand
```bash
pnpm add zustand
pnpm add -D @types/zustand
```
No provider wrapper needed — Zustand v4+ works without it.

### Step 2: Create `stores/toast-store.ts`
Replace `hooks/use-toast.ts`.

**Shape:**
```ts
interface ToastState {
  toasts: ToasterToast[]
  toast: (props: Omit<ToasterToast, "id">) => void
}
```

**Migration:**
- Move `TOAST_LIMIT`, `TOAST_REMOVE_DELAY`, `genId()`, `reducer` logic into the store.
- Export both `useToastStore` hook (for `Toaster` to read `toasts`) and imperative `toast()` function (for 50+ call sites).
- Keep `useToast()` hook as a thin wrapper: `const { toast } = useToast()` continues to work.
- Delete `hooks/use-toast.ts` after migration.

### Step 3: Create `stores/preview-store.ts`
Shared preview modal state.

**Shape:**
```ts
interface PreviewState {
  item: AssetPreviewDescriptor | null
  open: boolean
  openPreview: (item: AssetPreviewDescriptor) => void
  closePreview: () => void
}
```

**Migration:**
- `revision-panel.tsx`: Replace local `previewItem` / `isPreviewOpen` with store.
- `asset-revisions-section.tsx`: Same.
- `asset-card.tsx`: If "Preview" button needs to open the modal, it can call `openPreview()` directly.

### Step 4: Create `stores/kanban-store.ts`
Persist column collapse preferences.

**Shape:**
```ts
interface KanbanState {
  collapsedColumns: Set<KanbanWorkflowColumnId>
  toggleColumn: (id: KanbanWorkflowColumnId) => void
}
```

**Persistence:** Use `zustand/middleware` with `persist` to localStorage.

**Migration:**
- Replace `collapsedColumns` state in `board.tsx` with store read.
- Remove local `Set` manipulation; use `toggleColumn` action.

### Step 5: Wire Stores into App
No provider needed. Stores are imported directly by components.

Update `components/ui/toaster.tsx` to use `useToastStore` instead of `useToast` from `hooks/use-toast.ts`.
Update `app/dashboard/layout.tsx` if any auth/user state needs to be shared (currently not required — user is passed as prop).

### Step 6: Cleanup
- Delete `hooks/use-toast.ts` after toast migration is complete.
- Remove unused `useState` imports from migrated components.
- Run `pnpm lint` and `pnpm typecheck`.

---

## Validation
1. `pnpm typecheck` — no type errors from store imports.
2. `pnpm lint` — no lint errors.
3. `pnpm test` — existing vitest suite passes.
4. Manual smoke test:
   - Trigger toast from any page → toast appears.
   - Open preview from revision panel → modal opens with correct asset.
   - Collapse kanban columns → refresh page → columns remain collapsed.

---

## Risks
- **Over-migration**: Moving pure local state (e.g., form inputs in comments thread) to Zustand adds indirection without benefit. **Mitigation**: Only migrate state with ≥2 potential consumers or persistence needs.
- **Store coupling**: If any store grows too large, it becomes a god object. **Mitigation**: Enforce store boundaries; split if >3 unrelated domains appear.
- **Zustand + React 19 compatibility**: Zustand v4+ is compatible with React 19. **Mitigation**: Pin `zustand` to latest stable; verify with `pnpm typecheck`.
- **Toast API breakage**: 60+ call sites depend on `toast({...})` and `const { toast } = useToast()`. **Mitigation**: Preserve both APIs in the new store; run `pnpm test` and grep for all `toast(` call sites to verify none break.

---

## Open Questions
1. **Toast API contract**: The codebase has two toast call patterns: imperative `toast({...})` (~50 sites) and hook-based `const { toast } = useToast()` (13 sites). Should the Zustand store preserve **both** patterns exactly, or standardize on one?
   - **Recommended**: Preserve both. The imperative `toast()` is used in event handlers where hook calls would be awkward. A Zustand store naturally supports both: export an imperative `toast()` action and a `useToastStore` hook that returns `{ toast, toasts }`. The existing `useToast()` hook can become a thin wrapper.

2. Should `queue/page.tsx` upload state (`uploadingAssetIds`, `uploadErrors`, `editing`) move to a store?
   - **Recommended**: No — it is page-scoped with no cross-page consumer. Keep local.

3. Should `client-detail.tsx` form state move to a store?
   - **Recommended**: No — the form is deeply tied to a single client ID and resets on navigation. Keep local.
