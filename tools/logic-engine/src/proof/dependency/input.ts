import { FORMULA_GROUPING_POLICY_VERSION } from '@logiclab/contracts/formula-policy-values';
import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
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
      'formulaGroupingVersion',
      'premises',
      'conclusion',
      'permittedRuleIds',
    ]);

    const proof = record(outer.proof, ['proofVersion', 'format', 'steps']);

    if (
      (problem.ruleCatalogVersion === 2 &&
        problem.formulaGroupingVersion !== FORMULA_GROUPING_POLICY_VERSION) ||
      (problem.ruleCatalogVersion !== undefined &&
        proof.proofVersion !== undefined &&
        problem.ruleCatalogVersion !== proof.proofVersion) ||
      (problem.ruleCatalogVersion !== undefined &&
        problem.ruleCatalogVersion !== 1 &&
        problem.ruleCatalogVersion !== 2) ||
      (problem.formulaGroupingVersion !== undefined &&
        problem.formulaGroupingVersion !== FORMULA_GROUPING_POLICY_VERSION) ||
      (proof.proofVersion !== undefined && proof.proofVersion !== 1 && proof.proofVersion !== 2) ||
      (proof.format !== undefined && proof.format !== 'dependency')
    )
      throw new InputFailure(
        CheckerDiagnosticCode.UnsupportedVersion,
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
        'conjunctIndex',
        'lineReferences',
        'discharges',
      ]);

      ids(step, ['id', 'premiseId']);

      stringLimit(step.kind, 16);

      stringLimit(step.formula, PROOF_LIMITS.maxFormulaLength);

      stringLimit(step.ruleId, 64);

      if (
        step.conjunctIndex !== undefined &&
        step.conjunctIndex !== null &&
        (typeof step.conjunctIndex !== 'number' ||
          !Number.isInteger(step.conjunctIndex) ||
          step.conjunctIndex < 0 ||
          step.conjunctIndex > PROOF_LIMITS.maxFormulaLength)
      )
        throw new InputFailure(
          CheckerDiagnosticCode.InvalidStructure,
          'Invalid conjunct selection.',
        );

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
            code: CheckerDiagnosticCode.InvalidStructure,
            message: 'Dependency proof input does not match the supported contract.',
          },
        };
  } catch (error) {
    return {
      diagnostic:
        error instanceof InputFailure
          ? { code: error.code, message: error.message }
          : {
              code: CheckerDiagnosticCode.InvalidStructure,
              message: 'Dependency proof input could not be inspected as plain data.',
            },
    };
  }
}
