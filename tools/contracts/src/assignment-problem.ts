import { z } from 'zod';
import { objectiveProblemDefinitionSchema } from './problem';
import { fitchDerivationDefinitionSchema } from './derivation';
import { dependencyDerivationDefinitionSchema } from './dependency-derivation';
import { naturalDeductionTreeDerivationDefinitionSchema } from './natural-deduction-tree-derivation';
import { libraryProblemVersionSchema } from './problem-library';

/** Assigned transport stays narrower while truth-tree student workflows are staged. */
export const assignmentProblemDefinitionSchema = z.discriminatedUnion('type', [
  ...objectiveProblemDefinitionSchema.options,
  z.discriminatedUnion('format', [
    fitchDerivationDefinitionSchema,
    dependencyDerivationDefinitionSchema,
    naturalDeductionTreeDerivationDefinitionSchema,
  ]),
]);

export type AssignmentProblemDefinition = z.infer<typeof assignmentProblemDefinitionSchema>;

export const assignmentProblemVersionSchema = libraryProblemVersionSchema
  .omit({ definition: true })
  .extend({ definition: assignmentProblemDefinitionSchema });
