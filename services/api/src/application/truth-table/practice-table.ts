import {
  generateTruthTable,
  parseFormulaWithSyntax,
  requireExplicitGrouping,
} from '@logiclab/logic-engine';

/** New stateless practice uses explicit grouping; saved assignments keep their pinned policy. */
export function generatePracticeTruthTable(formula: string) {
  requireExplicitGrouping(parseFormulaWithSyntax(formula));
  return generateTruthTable(formula);
}
