import { z } from 'zod';
import { derivationDefinitionSchema } from './derivation';
import {
  problemDefinitionSchema,
  problemDraftSchema,
  problemVersionSchema,
  createProblemRequestSchema,
} from './problem';

/** Owner-only library shapes; assignment definitions retain their separate supported union. */
export const libraryProblemDefinitionSchema = z.discriminatedUnion('type', [
  ...problemDefinitionSchema.options,
  derivationDefinitionSchema,
]);
export type LibraryProblemDefinition = z.infer<typeof libraryProblemDefinitionSchema>;
export const libraryProblemDraftSchema = problemDraftSchema
  .omit({ definition: true })
  .extend({ definition: libraryProblemDefinitionSchema });
export type LibraryProblemDraft = z.infer<typeof libraryProblemDraftSchema>;
export const libraryProblemVersionSchema = problemVersionSchema
  .omit({ definition: true })
  .extend({ definition: libraryProblemDefinitionSchema });
export type LibraryProblemVersion = z.infer<typeof libraryProblemVersionSchema>;
export const createLibraryProblemRequestSchema = createProblemRequestSchema
  .omit({ definition: true })
  .extend({ definition: libraryProblemDefinitionSchema });
export type CreateLibraryProblemRequest = z.infer<typeof createLibraryProblemRequestSchema>;
export const updateLibraryProblemRequestSchema = createLibraryProblemRequestSchema
  .partial()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    'Provide at least one draft field.',
  );
export type UpdateLibraryProblemRequest = z.infer<typeof updateLibraryProblemRequestSchema>;

// Private library HTTP responses. These include instructor reference data.
export const libraryProblemResponseSchema = z.strictObject({ problem: libraryProblemDraftSchema });
export const libraryProblemListResponseSchema = z.strictObject({
  problems: z.array(libraryProblemDraftSchema),
  nextOffset: z.number().int().nonnegative().nullable(),
});
export const libraryProblemVersionResponseSchema = z.strictObject({
  version: libraryProblemVersionSchema,
});
export const libraryProblemVersionListResponseSchema = z.strictObject({
  versions: z.array(libraryProblemVersionSchema),
  nextOffset: z.number().int().nonnegative().nullable(),
});
