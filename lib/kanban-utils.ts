import type { AssetStatus } from '@/types/index';
import {
  type KanbanWorkflowColumnId,
  kanbanWorkflowColumnIds,
  getKanbanWorkflowColumnIndex,
  getKanbanWorkflowColumnId,
  getKanbanWorkflowStatusForColumn,
} from '@/lib/kanban-workflow';

export const statusOrder: KanbanWorkflowColumnId[] = [...kanbanWorkflowColumnIds];

export function getNextStatus(currentStatus: AssetStatus): AssetStatus | null {
  const currentIndex = getKanbanWorkflowColumnIndex(getKanbanWorkflowColumnId(currentStatus));
  if (currentIndex === -1 || currentIndex === statusOrder.length - 1) return null;
  return getKanbanWorkflowStatusForColumn(kanbanWorkflowColumnIds[currentIndex + 1]);
}

export function getPreviousStatus(currentStatus: AssetStatus): AssetStatus | null {
  const currentIndex = getKanbanWorkflowColumnIndex(getKanbanWorkflowColumnId(currentStatus));
  if (currentIndex <= 0) return null;
  return getKanbanWorkflowStatusForColumn(kanbanWorkflowColumnIds[currentIndex - 1]);
}

export function handleKanbanKeydown(
  event: React.KeyboardEvent,
  callbacks: {
    onMoveNext?: () => void;
    onMovePrev?: () => void;
    onQuickApprove?: () => void;
    onViewDetails?: () => void;
  }
) {
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      callbacks.onMoveNext?.();
      break;
    case 'ArrowLeft':
      event.preventDefault();
      callbacks.onMovePrev?.();
      break;
    case 'Enter':
      event.preventDefault();
      callbacks.onViewDetails?.();
      break;
    case ' ':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        callbacks.onQuickApprove?.();
      }
      break;
    default:
      break;
  }
}
