/** Append new IDs without replacing existing rows or changing the incoming page's order/content. */
export function appendPageById<T extends { id: string }>(
  current: readonly T[],
  page: readonly T[],
): T[] {
  const existingIds = new Set(current.map((item) => item.id));
  return [...current, ...page.filter((item) => !existingIds.has(item.id))];
}
