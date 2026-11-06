import { InputFailure, record, array, stringLimit, ids } from '../proof-input-fields';
import {
  PROOF_LIMITS,
  fitchProofCheckInputSchema,
  type FitchProofCheckInput,
  type ProofDiagnostic,
} from '@logiclab/contracts';

/** Check list/text bounds before Zod visits elements; never recursively traverse unknown fields. */
export function readFitchInput(
  value: unknown,
): { input: FitchProofCheckInput } | { diagnostic: ProofDiagnostic } {
  try {
    const outer = record(value, ['problem', 'proof']);

    const problem = record(outer.problem, [
      'ruleCatalogVersion',
      'premises',
      'conclusion',
      'permittedRuleIds',
    ]);

    const proof = record(outer.proof, ['proofVersion', 'format', 'steps', 'blocks']);

    if (
      (problem.ruleCatalogVersion !== undefined && problem.ruleCatalogVersion !== 1) ||
      (proof.proofVersion !== undefined && proof.proofVersion !== 1) ||
      (proof.format !== undefined && proof.format !== 'fitch')
    )
      throw new InputFailure('UNSUPPORTED_VERSION', 'Unsupported proof format or version.');

    stringLimit(problem.conclusion, PROOF_LIMITS.maxFormulaLength);

    for (const item of array(problem.premises, PROOF_LIMITS.maxPremises)) {
      const premise = record(item, ['id', 'formula']);
      ids(premise, ['id']);
      stringLimit(premise.formula, PROOF_LIMITS.maxFormulaLength);
    }

    for (const rule of array(problem.permittedRuleIds, PROOF_LIMITS.maxPermittedRules))
      stringLimit(rule, 64);

    for (const item of array(proof.blocks, PROOF_LIMITS.maxBlocks)) {
      const block = record(item, ['id', 'parentId', 'assumptionId', 'endId']);
      ids(block, ['id', 'parentId', 'assumptionId', 'endId']);
    }

    for (const item of array(proof.steps, PROOF_LIMITS.maxSteps)) {
      const step = record(item, [
        'kind',
        'id',
        'blockId',
        'formula',
        'premiseId',
        'ruleId',
        'lineReferences',
        'subproofReferences',
      ]);

      ids(step, ['id', 'blockId', 'premiseId']);

      stringLimit(step.formula, PROOF_LIMITS.maxFormulaLength);

      stringLimit(step.kind, 16);

      stringLimit(step.ruleId, 64);

      for (const key of ['lineReferences', 'subproofReferences']) {
        if (step[key] !== undefined)
          for (const reference of array(step[key], 2)) stringLimit(reference, 36);
      }
    }

    const parsed = fitchProofCheckInputSchema.safeParse(value);

    return parsed.success
      ? { input: parsed.data }
      : {
          diagnostic: {
            code: 'INVALID_STRUCTURE',
            message: 'Proof input does not match the supported contract.',
          },
        };
  } catch (error) {
    return {
      diagnostic:
        error instanceof InputFailure
          ? { code: error.code, message: error.message }
          : {
              code: 'INVALID_STRUCTURE',
              message: 'Proof input could not be inspected as plain data.',
            },
    };
  }
}
