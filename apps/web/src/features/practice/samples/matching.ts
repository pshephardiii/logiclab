import { ProblemType } from '@logiclab/contracts/problem-type';
import type { SavedDerivationContent } from '@logiclab/contracts/saved-student-work';
import type { TruthTreeContent } from '@logiclab/contracts/truth-tree-authoring';

type Statement = SavedDerivationContent | TruthTreeContent;

/** Conservative source matching: an edited statement is not advertised as the curated example. */
export function matchesSampleStatement(current: Statement, sample: Statement): boolean {
  if (
    current.type !== sample.type ||
    current.definitionVersion !== sample.definitionVersion ||
    current.checkerVersion !== sample.checkerVersion ||
    current.ruleCatalogVersion !== sample.ruleCatalogVersion ||
    current.formulaGroupingVersion !== sample.formulaGroupingVersion ||
    current.conclusion !== sample.conclusion ||
    current.premises.length !== sample.premises.length ||
    current.premises.some(
      (premise, index) =>
        premise.id !== sample.premises[index]!.id ||
        premise.formula !== sample.premises[index]!.formula,
    )
  )
    return false;

  if (current.type === ProblemType.Derivation) {
    if (sample.type !== ProblemType.Derivation) return false;

    return (
      current.format === sample.format &&
      current.rules.length === sample.rules.length &&
      current.rules.every(
        (rule, index) =>
          rule.id === sample.rules[index]!.id && rule.label === sample.rules[index]!.label,
      )
    );
  }

  return true;
}
