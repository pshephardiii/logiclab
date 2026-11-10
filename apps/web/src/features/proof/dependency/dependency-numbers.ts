/** Resolve current line positions before sorting; preserve stored IDs, duplicates and missing refs. */
export function dependencyNumbers(
  ids: string[],
  positions: Map<string, number>,
  missing = 'Missing line',
) {
  return ids
    .map((id) => positions.get(id))
    .sort((left, right) => (left ?? Infinity) - (right ?? Infinity))
    .map((number) => number ?? missing)
    .join(', ');
}
