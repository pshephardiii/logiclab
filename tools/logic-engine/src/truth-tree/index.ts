export { parseTruthTreeFormula, TRUTH_TREE_FORMULA_LIMITS } from './parse-formula';

export { TRUTH_TREE_RULE_CATALOG, TRUTH_TREE_RULE_CATALOG_VERSION } from './rule-catalog';

export type { TruthTreeRuleId } from './rule-catalog';

export { decomposeTruthTreeFormula } from './decompose-formula';

export { areTruthTreeComplements } from './contradiction';

export type { TruthTreeFormula, TruthTreeFormulaExpansion, TruthTreeDecomposition } from './types';

export { analyzeTruthTreeStructure } from './structure';

export type { TruthTreeStructureResult } from './structure';

export { checkTruthTreeSteps } from './check-steps';

export { checkTruthTree } from './check-tree';

export { isFinishedTruthTreeAttempt } from './completeness';
