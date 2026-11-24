import { ProblemType } from '@logiclab/contracts/problem-type';
import { formulaGroupingPolicy } from '@logiclab/contracts/formula-policy-values';
import { requireExplicitGrouping } from '@logiclab/logic-engine';
import { proofProblemSchema, type ProofCheckReport } from '@logiclab/contracts';
import type {
  SavedDerivationContent,
  SavedDerivationAnswer,
} from '@logiclab/contracts/saved-student-work';
import {
  parseProofFormula,
  parseProofFormulaWithSyntax,
  checkFitchProof,
  checkDependencyProof,
  checkNaturalDeductionTreeProof,
} from '@logiclab/logic-engine/proof';
import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';

export type PracticeStatement = SavedDerivationContent;

export type PracticeProof = SavedDerivationAnswer['proof'];

/** Validate a student's own target without requiring a reference or claiming it is provable. */
export function practiceStatement(
  format: PracticeStatement['format'],
  premises: PracticeStatement['premises'],
  conclusion: string,
  permittedRuleIds: string[],
): PracticeStatement {
  const ruleCatalogVersion = format === 'tree' ? 1 : 2;
  const grouping = ruleCatalogVersion === 2 ? { formulaGroupingVersion: 1 as const } : {};
  const problem = proofProblemSchema.parse({
    ruleCatalogVersion,
    ...grouping,
    premises,
    conclusion,
    permittedRuleIds,
  });

  if (new Set(problem.premises.map((premise) => premise.id)).size !== problem.premises.length)
    throw new Error('Premise identities must be distinct.');

  if (new Set(permittedRuleIds).size !== permittedRuleIds.length)
    throw new Error('Each permitted rule may be selected only once.');

  for (const [index, premise] of problem.premises.entries()) {
    try {
      if (ruleCatalogVersion === 2)
        requireExplicitGrouping(parseProofFormulaWithSyntax(premise.formula));
      else parseProofFormula(premise.formula);
    } catch (error) {
      throw new Error(
        `Premise ${index + 1}: ${error instanceof Error ? error.message : 'Invalid formula.'}`,
      );
    }
  }

  try {
    if (ruleCatalogVersion === 2)
      requireExplicitGrouping(parseProofFormulaWithSyntax(problem.conclusion));
    else parseProofFormula(problem.conclusion);
  } catch (error) {
    throw new Error(`Conclusion: ${error instanceof Error ? error.message : 'Invalid formula.'}`);
  }

  const rules = permittedRuleIds.map((id) => {
    const rule = getPropositionalRule(id, ruleCatalogVersion);

    if (!rule) throw new Error('Select rules from the supported propositional catalog.');

    return { id: rule.id, label: rule.label };
  });

  const statement = {
    type: ProblemType.Derivation,
    definitionVersion: 1,
    checkerVersion: 1,
    premises: problem.premises,
    conclusion: problem.conclusion,
    rules,
  } satisfies Omit<PracticeStatement, 'format' | 'ruleCatalogVersion'>;
  return format === 'tree'
    ? { ...statement, format, ruleCatalogVersion: 1 }
    : { ...statement, format, ruleCatalogVersion: 2, formulaGroupingVersion: 1 };
}

/** Practice checks are local and explicit; they never save work or award assignment points. */
export function checkPracticeProof(
  statement: PracticeStatement,
  proof: PracticeProof,
): ProofCheckReport {
  if (proof.format !== statement.format) throw new Error('The proof must use the selected format.');

  const check =
    statement.format === 'tree'
      ? checkNaturalDeductionTreeProof
      : statement.format === 'dependency'
        ? checkDependencyProof
        : checkFitchProof;

  return check({
    problem: {
      ruleCatalogVersion: statement.ruleCatalogVersion,
      ...formulaGroupingPolicy(statement),
      premises: statement.premises,
      conclusion: statement.conclusion,
      permittedRuleIds: statement.rules.map((rule) => rule.id),
    },
    proof,
  });
}
