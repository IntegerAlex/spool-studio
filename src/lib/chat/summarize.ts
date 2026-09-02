/**
 * Context/token budget controls for tool results.
 *
 * Long tool results must be paginated/truncated *before* they re-enter the
 * model context so repeated turns don't re-process large blobs and tool
 * outputs stay compact and parseable.
 */

export const DEFAULT_RESULT_LIMIT = 10

export interface SummarizedList<T> {
  count: number
  shown: number
  truncated: boolean
  items: T[]
}

/**
 * Wrap a list so it is never dumped wholesale into context. If the caller
 * over-returned, only the first `limit` items survive (the full `count` is
 * still reported so the model knows more rows exist and can page).
 */
export function summarizeList<T>(
  items: T[],
  limit: number = DEFAULT_RESULT_LIMIT,
): SummarizedList<T> {
  const total = items.length
  const shown = Math.min(total, Math.max(1, limit))
  return {
    count: total,
    shown,
    truncated: shown < total,
    items: items.slice(0, shown),
  }
}
