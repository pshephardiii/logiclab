import { z } from 'zod';
import { CheckerDiagnosticCode } from './checker-diagnostic-code';
import { truthTreeIdSchema as id } from './truth-tree-fields';

export const truthTreeDiagnosticCodeSchema = z.enum([
  CheckerDiagnosticCode.UnsupportedVersion,
  CheckerDiagnosticCode.ResourceLimit,
  CheckerDiagnosticCode.InvalidStructure,
  CheckerDiagnosticCode.InvalidReference,
  CheckerDiagnosticCode.IncompleteTree,
  CheckerDiagnosticCode.InvalidProblem,
  CheckerDiagnosticCode.InvalidFormula,
  CheckerDiagnosticCode.InitialMismatch,
  CheckerDiagnosticCode.UnknownRule,
  CheckerDiagnosticCode.RuleMismatch,
  CheckerDiagnosticCode.InvalidClosure,
  CheckerDiagnosticCode.VerificationFailed,
]);

export type TruthTreeDiagnosticCode = z.infer<typeof truthTreeDiagnosticCodeSchema>;

/** Checking evidence only; no argument-validity verdict or awarded points. */
export const truthTreeDiagnosticSchema = z.strictObject({
  code: truthTreeDiagnosticCodeSchema,
  message: z.string().min(1).max(500),
  branchId: id.optional(),
  occurrenceId: id.optional(),
  expansionId: id.optional(),
});

export type TruthTreeDiagnostic = z.infer<typeof truthTreeDiagnosticSchema>;
