export type DischargedDependencySet = {
  assumptionId: string;
  conclusionDependencies: readonly string[];
};

/**
 * Trusted resolved citations only. Discharge removes an assumption from its own branch,
 * not from other cited contexts. This arithmetic does not validate a rule or a citation.
 */
export function inferenceDependencyIds(
  lines: readonly (readonly string[])[],
  branches: readonly DischargedDependencySet[],
): string[] {
  const dependencies = new Set<string>();
  for (const line of lines) {
    for (const id of line) dependencies.add(id);
  }
  for (const branch of branches) {
    for (const id of branch.conclusionDependencies) {
      if (id !== branch.assumptionId) dependencies.add(id);
    }
  }
  return [...dependencies].sort();
}

/** Exact set equality: order is presentation; duplicates and extra/missing sources are errors. */
export function dependencySetsMatch(declared: readonly string[], expected: readonly string[]) {
  const declaredSet = new Set(declared);
  const expectedSet = new Set(expected);
  return (
    declaredSet.size === declared.length &&
    expectedSet.size === expected.length &&
    declaredSet.size === expectedSet.size &&
    expected.every((id) => declaredSet.has(id))
  );
}
