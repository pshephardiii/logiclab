import type { ProblemType } from './enums.js';

/**
 * Authored content shared by Problem drafts and ProblemVersion snapshots.
 * This first slice supports truth tables only. Add future exercise definitions as
 * a union discriminated by `type`, rather than creating another problem entity.
 * Each variant owns its data-format version; derivation fields/rules remain undecided.
 * Expected answers and student attempts are separate from this authored definition.
 */
export type ProblemDefinition = {
  type: `${ProblemType.TruthTable}`;
  definitionVersion: 1;
  formula: string;
};
