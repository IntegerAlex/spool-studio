import { describe, expect, it, beforeEach } from "vitest"
import type { ToasterToast } from "@/stores/toast-store"
import { useToastStore } from "@/stores/toast-store"
import { usePreviewStore } from "@/stores/preview-store"
import { useKanbanStore } from "@/stores/kanban-store"
import type { KanbanWorkflowColumnId } from "@/lib/kanban-workflow"
import type { AssetPreviewDescriptor } from "@/lib/asset-preview"

function makeToast(id: string): ToasterToast {
  return { id, open: true }
}

const draftColumn = "draft" satisfies KanbanWorkflowColumnId
const approvedColumn = "approved" satisfies KanbanWorkflowColumnId

describe("toast-store", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it("adds a toast and enforces TOAST_LIMIT of 1", () => {
    const { addToast } = useToastStore.getState()
    addToast(makeToast("1"))
    expect(useToastStore.getState().toasts).toHaveLength(1)
    addToast(makeToast("2"))
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0].id).toBe("2")
  })

  it("updates an existing toast by id", () => {
    const { addToast, updateToast } = useToastStore.getState()
    addToast({ ...makeToast("1"), title: "before" })
    updateToast({ id: "1", title: "after" })
    expect(useToastStore.getState().toasts[0].title).toBe("after")
  })

  it("dismiss marks open=false but keeps toast for exit animation", () => {
    const { addToast, dismissToast } = useToastStore.getState()
    addToast(makeToast("1"))
    dismissToast("1")
    const toast = useToastStore.getState().toasts[0]
    expect(toast.open).toBe(false)
  })

  it("removeToast filters by id; undefined clears all", () => {
    const { addToast, removeToast } = useToastStore.getState()
    addToast(makeToast("1"))
    removeToast("1")
    expect(useToastStore.getState().toasts).toHaveLength(0)
    addToast({ ...makeToast("a"), open: false })
    addToast({ ...makeToast("b"), open: false })
    // limit keeps only latest
    removeToast(undefined)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it("dismissToast with no id marks all toasts closed", () => {
    const { setState } = useToastStore
    setState({
      toasts: [makeToast("a"), makeToast("b")],
    })
    useToastStore.getState().dismissToast(undefined)
    expect(useToastStore.getState().toasts.every((t) => !t.open)).toBe(true)
  })
})

describe("preview-store", () => {
  beforeEach(() => {
    usePreviewStore.setState({ item: null, open: false })
  })

  it("opens with an item", () => {
    const descriptor = { title: "test.png" } satisfies AssetPreviewDescriptor
    usePreviewStore.getState().openPreview(descriptor)
    expect(usePreviewStore.getState().open).toBe(true)
    expect(usePreviewStore.getState().item?.title).toBe("test.png")
  })

  it("closes but retains the last item (for exit animation)", () => {
    const descriptor = { title: "test.png" } satisfies AssetPreviewDescriptor
    usePreviewStore.getState().openPreview(descriptor)
    usePreviewStore.getState().closePreview()
    expect(usePreviewStore.getState().open).toBe(false)
    expect(usePreviewStore.getState().item).not.toBeNull()
  })
})

describe("kanban-store", () => {
  beforeEach(() => {
    useKanbanStore.setState({ collapsedColumns: [] })
  })

  it("toggles a column id on then off", () => {
    const { toggleColumn } = useKanbanStore.getState()
    toggleColumn(draftColumn)
    expect(useKanbanStore.getState().collapsedColumns).toContain("draft")
    toggleColumn(draftColumn)
    expect(useKanbanStore.getState().collapsedColumns).not.toContain("draft")
  })

  it("tracks multiple columns independently", () => {
    const { toggleColumn } = useKanbanStore.getState()
    toggleColumn(draftColumn)
    toggleColumn(approvedColumn)
    expect(useKanbanStore.getState().collapsedColumns).toEqual([
      "draft",
      "approved",
    ])
  })
})
