"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type { KanbanWorkflowColumnId } from "@/lib/kanban-workflow"

interface KanbanState {
  collapsedColumns: KanbanWorkflowColumnId[]
  toggleColumn: (id: KanbanWorkflowColumnId) => void
}

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set) => ({
      collapsedColumns: [],
      toggleColumn: (id) =>
        set((state) => ({
          collapsedColumns: state.collapsedColumns.includes(id)
            ? state.collapsedColumns.filter((column) => column !== id)
            : [...state.collapsedColumns, id],
        })),
    }),
    {
      name: "kanban-preferences",
      // zustand's default getter reads window.localStorage, which does not
      // exist in node test envs; globalThis covers both browser and tests.
      storage: createJSONStorage(() => globalThis.localStorage),
    },
  ),
)
