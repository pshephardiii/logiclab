import { z } from 'zod';
import { truthTreeStepReportSchema } from './truth-tree-step-report';
import { truthTreeDiagnosticSchema } from './truth-tree-diagnostics';
import { TRUTH_TREE_LIMITS, truthTreeIdSchema as id } from './truth-tree-fields';

/** Terminal paths only; internal splitting segments are not independently open or closed. */
export const truthTreeBranchOutcomeSchema = z.strictObject({
  branchId: id,
  status: z.enum(['closed', 'open_complete', 'incomplete', 'needs_closure']),
  unexpandedOccurrenceIds: z.array(id).max(TRUTH_TREE_LIMITS.maxOccurrences),
});

export type TruthTreeBranchOutcome = z.infer<typeof truthTreeBranchOutcomeSchema>;

export const truthTreeCounterexampleSchema = z.strictObject({
  branchId: id,
  assignment: z.record(z.string().regex(/^[A-Z]$/), z.boolean()),
});

export type TruthTreeCounterexample = z.infer<typeof truthTreeCounterexampleSchema>;

/** Verified argument evidence, separate from a grade, reference proof or client claim. */
export const truthTreeCheckReportSchema = z
  .strictObject({
    checkerVersion: z.literal(1),
    ruleCatalogVersion: z.literal(1),
    status: z.enum(['verified', 'incomplete', 'invalid', 'unassessable']),
    argumentStatus: z.enum(['valid', 'invalid', 'undetermined']),
    steps: truthTreeStepReportSchema,
    branches: z.array(truthTreeBranchOutcomeSchema).max(TRUTH_TREE_LIMITS.maxBranches),
    counterexample: truthTreeCounterexampleSchema.nullable(),
    diagnostics: z.array(truthTreeDiagnosticSchema).max(TRUTH_TREE_LIMITS.maxDiagnostics),
  })
  .superRefine((report, context) => {
    const reject = (message: string) => context.addIssue({ code: 'custom', message });

    if (new Set(report.branches.map((branch) => branch.branchId)).size !== report.branches.length)
      reject('Terminal branch evidence must have distinct identities.');

    for (const branch of report.branches) {
      if (
        new Set(branch.unexpandedOccurrenceIds).size !== branch.unexpandedOccurrenceIds.length ||
        (['closed', 'open_complete'].includes(branch.status) &&
          branch.unexpandedOccurrenceIds.length > 0) ||
        (branch.status === 'incomplete' && branch.unexpandedOccurrenceIds.length === 0)
      )
        reject('Branch completeness evidence must agree with its unexpanded occurrences.');

      if (
        (branch.status === 'closed') !==
        report.steps.closures.some(
          (closure) => closure.branchId === branch.branchId && closure.status === 'valid',
        )
      )
        reject('Closed branch outcomes must match verified closure evidence.');

      if (
        branch.unexpandedOccurrenceIds.some(
          (id) =>
            !report.steps.occurrences.some(
              (occurrence) => occurrence.occurrenceId === id && occurrence.status === 'valid',
            ),
        )
      )
        reject('Unexpanded occurrences must identify parsed submitted formulas.');
    }

    if (
      report.steps.status === 'checked' &&
      report.branches.length > 0 &&
      report.steps.closures.some(
        (closure) =>
          !report.branches.some(
            (branch) => branch.branchId === closure.branchId && branch.status === 'closed',
          ),
      )
    )
      reject('Every checked closure must appear in the terminal branch outcomes.');

    if (report.status === 'verified') {
      if (
        report.steps.status !== 'checked' ||
        report.diagnostics.length > 0 ||
        report.branches.length === 0 ||
        report.argumentStatus === 'undetermined'
      )
        reject('Verified arguments require checked steps and terminal branch evidence.');

      if (
        report.argumentStatus === 'valid' &&
        (report.counterexample !== null ||
          report.branches.some((branch) => branch.status !== 'closed'))
      )
        reject('Valid arguments require every terminal branch to be explicitly closed.');

      if (
        report.argumentStatus === 'invalid' &&
        (!report.counterexample ||
          !report.branches.some(
            (branch) =>
              branch.branchId === report.counterexample?.branchId &&
              branch.status === 'open_complete',
          ))
      )
        reject('Invalid arguments require a counterexample from a completed open branch.');
    } else if (report.argumentStatus !== 'undetermined' || report.counterexample !== null) {
      reject('Unverified work cannot claim an argument outcome or counterexample.');
    }

    if (
      report.status !== 'verified' &&
      report.diagnostics.length + report.steps.diagnostics.length === 0
    )
      reject('Unverified work must explain why checking did not verify an outcome.');

    if (report.steps.status !== 'checked' && report.branches.length > 0)
      reject('Branch outcomes require wholly checked local work.');

    if (report.status === 'invalid' && report.steps.status !== 'invalid')
      reject('Invalid work requires invalid step evidence.');

    if (report.status === 'incomplete' && !['checked', 'incomplete'].includes(report.steps.status))
      reject('Incomplete work requires unfinished or checked steps.');

    if (
      report.status === 'incomplete' &&
      report.steps.status === 'checked' &&
      (report.branches.length === 0 ||
        report.branches.every((branch) => branch.status === 'closed') ||
        report.branches.some((branch) => branch.status === 'open_complete'))
    )
      reject('Incomplete checked work must lack both a complete open path and an all-closed tree.');

    if (
      report.status === 'unassessable' &&
      (report.steps.status !== 'unassessable' || report.branches.length > 0)
    )
      reject('Unassessable checking cannot retain partial certification.');
  });

export type TruthTreeCheckReport = z.infer<typeof truthTreeCheckReportSchema>;
