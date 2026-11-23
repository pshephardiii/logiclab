/** Explicit source-grouping policy; omission in retained definitions means original precedence. */
export const FORMULA_GROUPING_POLICY_VERSION = 1;

/** Copy only an already-validated pinned policy, keeping older payload shapes unchanged. */
export function formulaGroupingPolicy(value: {
  readonly formulaGroupingVersion?: typeof FORMULA_GROUPING_POLICY_VERSION;
}): { formulaGroupingVersion?: typeof FORMULA_GROUPING_POLICY_VERSION } {
  return value.formulaGroupingVersion === undefined
    ? {}
    : { formulaGroupingVersion: value.formulaGroupingVersion };
}
