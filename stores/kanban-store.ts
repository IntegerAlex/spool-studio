"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
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
    { name: "kanban-preferences" },
  ),
)
