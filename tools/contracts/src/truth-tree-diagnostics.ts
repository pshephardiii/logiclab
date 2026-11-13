import { z } from 'zod';
import { truthTreeIdSchema as id } from './truth-tree-fields';

/** Structural evidence only; no argument-validity verdict or awarded points. */
export const truthTreeDiagnosticSchema = z.strictObject({
  code: z.enum([
    'UNSUPPORTED_VERSION',
    'RESOURCE_LIMIT',
    'INVALID_STRUCTURE',
    'INVALID_REFERENCE',
    'INCOMPLETE_TREE',
  ]),
  message: z.string().min(1).max(500),
  branchId: id.optional(),
  occurrenceId: id.optional(),
  expansionId: id.optional(),
});

export type TruthTreeDiagnostic = z.infer<typeof truthTreeDiagnosticSchema>;
