import { z } from 'zod';
import { truthTreeDiagnosticSchema } from './truth-tree-diagnostics';
import { TRUTH_TREE_LIMITS, truthTreeIdSchema as id } from './truth-tree-fields';

/** Local checking evidence. Even checked work may have unexpanded formulas and open branches. */
export const truthTreeStepReportSchema = z
  .strictObject({
    checkerVersion: z.literal(1),
    ruleCatalogVersion: z.union([z.literal(1), z.literal(2)]),
    status: z.enum(['checked', 'incomplete', 'invalid', 'unassessable']),
    initial: z.enum(['valid', 'invalid', 'unknown']),
    occurrences: z
      .array(
        z.strictObject({ occurrenceId: id, status: z.enum(['valid', 'invalid', 'incomplete']) }),
      )
      .max(TRUTH_TREE_LIMITS.maxOccurrences),
    expansions: z
      .array(z.strictObject({ expansionId: id, status: z.enum(['valid', 'invalid', 'unknown']) }))
      .max(TRUTH_TREE_LIMITS.maxExpansions),
    closures: z
      .array(z.strictObject({ branchId: id, status: z.enum(['valid', 'invalid', 'unknown']) }))
      .max(TRUTH_TREE_LIMITS.maxBranches),
    diagnostics: z.array(truthTreeDiagnosticSchema).max(TRUTH_TREE_LIMITS.maxDiagnostics),
  })
  .superRefine((report, context) => {
    const reject = (message: string) => context.addIssue({ code: 'custom', message });

    for (const ids of [
      report.occurrences.map((entry) => entry.occurrenceId),
      report.expansions.map((entry) => entry.expansionId),
      report.closures.map((entry) => entry.branchId),
    ]) {
      if (new Set(ids).size !== ids.length)
        reject('Each evidence identity must appear once per collection.');
    }

    if (
      report.status === 'checked' &&
      (report.initial !== 'valid' ||
        report.diagnostics.length > 0 ||
        report.occurrences.length === 0 ||
        [...report.occurrences, ...report.expansions, ...report.closures].some(
          (entry) => entry.status !== 'valid',
        ))
    )
      reject('Checked steps require valid initial formulas and wholly valid local evidence.');

    if (report.status !== 'checked' && report.diagnostics.length === 0)
      reject('Unfinished or rejected checking must explain why.');

    if (
      report.status === 'unassessable' &&
      (report.initial !== 'unknown' ||
        report.occurrences.length + report.expansions.length + report.closures.length > 0)
    )
      reject('Unassessable checking cannot certify partial evidence.');
  });

export type TruthTreeStepReport = z.infer<typeof truthTreeStepReportSchema>;
