import {
  PROOF_LIMITS,
  dependencyProofCheckInputSchema,
  type DependencyProofCheckInput,
  type ProofDiagnostic,
} from '@logiclab/contracts';
import { InputFailure, record, array, stringLimit, ids } from '../proof-input-fields';

/** Inspect bounded plain data before schema parsing; never follow unknown fields recursively. */
export function readDependencyInput(
  value: unknown,
): { input: DependencyProofCheckInput } | { diagnostic: ProofDiagnostic } {
  try {
    const outer = record(value, ['problem', 'proof']);

    const problem = record(outer.problem, [
      'ruleCatalogVersion',
      'premises',
      'conclusion',
      'permittedRuleIds',
    ]);

    const proof = record(outer.proof, ['proofVersion', 'format', 'steps']);

    if (
      (problem.ruleCatalogVersion !== undefined && problem.ruleCatalogVersion !== 1) ||
      (proof.proofVersion !== undefined && proof.proofVersion !== 1) ||
      (proof.format !== undefined && proof.format !== 'dependency')
    )
      throw new InputFailure(
        'UNSUPPORTED_VERSION',
        'Unsupported dependency proof format or version.',
      );

    stringLimit(problem.conclusion, PROOF_LIMITS.maxFormulaLength);

    for (const item of array(problem.premises, PROOF_LIMITS.maxPremises)) {
      const premise = record(item, ['id', 'formula']);

      ids(premise, ['id']);

      stringLimit(premise.formula, PROOF_LIMITS.maxFormulaLength);
    }

    for (const rule of array(problem.permittedRuleIds, PROOF_LIMITS.maxPermittedRules))
      stringLimit(rule, 64);

    for (const item of array(proof.steps, PROOF_LIMITS.maxSteps)) {
      const step = record(item, [
        'kind',
        'id',
        'formula',
        'dependencies',
        'premiseId',
        'ruleId',
        'lineReferences',
        'discharges',
      ]);

      ids(step, ['id', 'premiseId']);

      stringLimit(step.kind, 16);

      stringLimit(step.formula, PROOF_LIMITS.maxFormulaLength);

      stringLimit(step.ruleId, 64);

      for (const dependency of array(step.dependencies, PROOF_LIMITS.maxSteps))
        stringLimit(dependency, 36);

      if (step.lineReferences !== undefined)
        for (const reference of array(step.lineReferences, 2)) stringLimit(reference, 36);

      if (step.discharges !== undefined)
        for (const value of array(step.discharges, 2)) {
          const discharge = record(value, ['assumptionId', 'conclusionId']);

          ids(discharge, ['assumptionId', 'conclusionId']);
        }
    }

    const parsed = dependencyProofCheckInputSchema.safeParse(value);

    return parsed.success
      ? { input: parsed.data }
      : {
          diagnostic: {
            code: 'INVALID_STRUCTURE',
            message: 'Dependency proof input does not match the supported contract.',
          },
        };
  } catch (error) {
    return {
      diagnostic:
        error instanceof InputFailure
          ? { code: error.code, message: error.message }
          : {
              code: 'INVALID_STRUCTURE',
              message: 'Dependency proof input could not be inspected as plain data.',
            },
    };
  }
}
