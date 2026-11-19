import { z } from 'zod';
import { objectiveProblemDefinitionSchema } from './problem';
import { fitchDerivationDefinitionSchema } from './derivation';
import { dependencyDerivationDefinitionSchema } from './dependency-derivation';
import { naturalDeductionTreeDerivationDefinitionSchema } from './natural-deduction-tree-derivation';
import { libraryProblemVersionSchema } from './problem-library';
import { truthTreeDefinitionSchema } from './truth-tree-authoring';

/** Assignment transport; the server enforces method, reference and assessment policy admission. */
export const assignmentProblemDefinitionSchema = z.discriminatedUnion('type', [
  ...objectiveProblemDefinitionSchema.options,
  truthTreeDefinitionSchema,
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
