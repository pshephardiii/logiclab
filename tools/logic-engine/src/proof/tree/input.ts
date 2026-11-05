import {
  PROOF_LIMITS,
  treeProofCheckInputSchema,
  type TreeProofCheckInput,
  type ProofDiagnostic,
} from '@logiclab/contracts';
import { InputFailure, record, array, stringLimit, ids } from '../proof-input-fields';

/** Bound plain flat data before Zod; never invoke accessors or recursively traverse unknown fields. */
export function readTreeInput(
  value: unknown,
): { input: TreeProofCheckInput } | { diagnostic: ProofDiagnostic } {
  try {
    const outer = record(value, ['problem', 'proof']);
    const problem = record(outer.problem, [
      'ruleCatalogVersion',
      'premises',
      'conclusion',
      'permittedRuleIds',
    ]);
    const proof = record(outer.proof, ['proofVersion', 'format', 'rootId', 'nodes']);
    if (
      (problem.ruleCatalogVersion !== undefined && problem.ruleCatalogVersion !== 1) ||
      (proof.proofVersion !== undefined && proof.proofVersion !== 1) ||
      (proof.format !== undefined && proof.format !== 'tree')
    )
      throw new InputFailure('UNSUPPORTED_VERSION', 'Unsupported tree proof format or version.');
    ids(proof, ['rootId']);
    stringLimit(problem.conclusion, PROOF_LIMITS.maxFormulaLength);
    for (const value of array(problem.premises, PROOF_LIMITS.maxPremises)) {
      const premise = record(value, ['id', 'formula']);
      ids(premise, ['id']);
      stringLimit(premise.formula, PROOF_LIMITS.maxFormulaLength);
    }
    for (const rule of array(problem.permittedRuleIds, PROOF_LIMITS.maxPermittedRules))
      stringLimit(rule, 64);
    for (const value of array(proof.nodes, PROOF_LIMITS.maxSteps)) {
      const node = record(value, [
        'id',
        'kind',
        'formula',
        'premiseId',
        'ruleId',
        'lineReferences',
        'branches',
      ]);
      ids(node, ['id', 'premiseId']);
      stringLimit(node.kind, 16);
      stringLimit(node.formula, PROOF_LIMITS.maxFormulaLength);
      stringLimit(node.ruleId, 64);
      if (node.lineReferences !== undefined)
        for (const id of array(node.lineReferences, 2)) stringLimit(id, 36);
      if (node.branches !== undefined)
        for (const value of array(node.branches, 2)) {
          const branch = record(value, ['rootId', 'assumptionFormula', 'assumptionIds']);
          ids(branch, ['rootId']);
          stringLimit(branch.assumptionFormula, PROOF_LIMITS.maxFormulaLength);
          for (const id of array(branch.assumptionIds, PROOF_LIMITS.maxSteps)) stringLimit(id, 36);
        }
    }
    const parsed = treeProofCheckInputSchema.safeParse(value);
    return parsed.success
      ? { input: parsed.data }
      : {
          diagnostic: {
            code: 'INVALID_STRUCTURE',
            message: 'Tree proof input does not match the supported contract.',
          },
        };
  } catch (error) {
    return {
      diagnostic:
        error instanceof InputFailure
          ? { code: error.code, message: error.message }
          : {
              code: 'INVALID_STRUCTURE',
              message: 'Tree proof input could not be inspected as plain data.',
            },
    };
  }
}
