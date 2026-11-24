import { FORMULA_GROUPING_POLICY_VERSION } from './formula-policy-values';
import { ProblemType } from './problem-type';
import { z } from 'zod';
import {
  truthTreeSchema,
  truthTreeCheckReportSchema,
  truthTreeCounterexampleSchema,
} from './truth-tree';
import {
  TRUTH_TREE_LIMITS,
  truthTreeIdSchema as id,
  truthTreeFormulaTextSchema as formula,
} from './truth-tree-fields';

export const TRUTH_TREE_AUTHORING_LIMITS = Object.freeze({ explanation: 5000 });

/** Statement-only data. Draft blanks are allowed; publication checks the actual argument. */
export const truthTreeContentSchema = z
  .strictObject({
    type: z.literal(ProblemType.TruthTree),
    definitionVersion: z.literal(1),
    checkerVersion: z.literal(1),
    ruleCatalogVersion: z.union([z.literal(1), z.literal(2)]),
    formulaGroupingVersion: z.literal(FORMULA_GROUPING_POLICY_VERSION).optional(),
    premises: z.array(z.strictObject({ id, formula })).max(TRUTH_TREE_LIMITS.maxPremises),
    conclusion: formula,
  })
  .superRefine((content, context) => {
    if (
      content.ruleCatalogVersion === 2 &&
      content.formulaGroupingVersion !== FORMULA_GROUPING_POLICY_VERSION
    )
      context.addIssue({
        code: 'custom',
        path: ['formulaGroupingVersion'],
        message: 'Catalog 2 requires explicit formula grouping policy 1.',
      });

    const seen = new Set<string>();
    content.premises.forEach((premise, index) => {
      if (seen.has(premise.id))
        context.addIssue({
          code: 'custom',
          path: ['premises', index, 'id'],
          message: 'Premise identities must be distinct.',
        });
      seen.add(premise.id);
    });
  });

export type TruthTreeContent = z.infer<typeof truthTreeContentSchema>;

const explanation = z
  .string()
  .trim()
  .max(TRUTH_TREE_AUTHORING_LIMITS.explanation)
  .nullable()
  .optional();

/** Owner-only draft JSON; expected outcomes and cached verification claims are not authored fields. */
export const truthTreeDefinitionSchema = truthTreeContentSchema
  .safeExtend({ referenceTree: truthTreeSchema.nullable(), explanation })
  .superRefine((definition, context) => {
    if (
      definition.referenceTree !== null &&
      definition.referenceTree.treeVersion !== definition.ruleCatalogVersion
    )
      context.addIssue({
        code: 'custom',
        path: ['referenceTree', 'treeVersion'],
        message: 'The reference tree must use the statement’s rule catalog.',
      });
  });

export type TruthTreeDefinition = z.infer<typeof truthTreeDefinitionSchema>;

export const truthTreeReferenceCheckSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('missing') }),
  z.strictObject({ status: z.literal('checked'), report: truthTreeCheckReportSchema }),
]);

export type TruthTreeReferenceCheck = z.infer<typeof truthTreeReferenceCheckSchema>;

/** Privileged reveal only; ordinary content never carries the reference, verdict or explanation. */
export const truthTreeSolutionSchema = z
  .strictObject({
    type: z.literal(ProblemType.TruthTree),
    definitionVersion: z.literal(1),
    checkerVersion: z.literal(1),
    ruleCatalogVersion: z.union([z.literal(1), z.literal(2)]),
    formulaGroupingVersion: z.literal(FORMULA_GROUPING_POLICY_VERSION).optional(),
    referenceTree: truthTreeSchema,
    argumentStatus: z.enum(['valid', 'invalid']),
    counterexample: truthTreeCounterexampleSchema.nullable(),
    explanation,
  })
  .superRefine((solution, context) => {
    if (
      solution.ruleCatalogVersion === 2 &&
      solution.formulaGroupingVersion !== FORMULA_GROUPING_POLICY_VERSION
    )
      context.addIssue({
        code: 'custom',
        path: ['formulaGroupingVersion'],
        message: 'Catalog 2 requires explicit formula grouping policy 1.',
      });

    if (solution.referenceTree.treeVersion !== solution.ruleCatalogVersion)
      context.addIssue({
        code: 'custom',
        path: ['referenceTree', 'treeVersion'],
        message: 'The reference tree must use the solution’s rule catalog.',
      });

    if ((solution.argumentStatus === 'invalid') !== (solution.counterexample !== null))
      context.addIssue({
        code: 'custom',
        message: 'Invalid arguments need a counterexample; valid arguments cannot include one.',
      });

    if (
      solution.counterexample &&
      !solution.referenceTree.branches.some(
        (branch) =>
          branch.id === solution.counterexample?.branchId && branch.ending.kind === 'open',
      )
    )
      context.addIssue({
        code: 'custom',
        message: 'The counterexample must identify an open reference-tree branch.',
      });
  });

export type TruthTreeSolution = z.infer<typeof truthTreeSolutionSchema>;
