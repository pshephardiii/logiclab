import { z } from 'zod';
import { trueFalseDefinitionSchema, multipleChoiceDefinitionSchema } from './conceptual-question';

// Authored draft data; publication and classroom sharing have separate lifecycles.
export const truthTableDefinitionSchema = z.strictObject({
  type: z.literal('truth_table'),
  definitionVersion: z.literal(1),
  formula: z.string().min(1).max(256),
});
export const problemDefinitionSchema = z.discriminatedUnion('type', [
  truthTableDefinitionSchema,
  trueFalseDefinitionSchema,
  multipleChoiceDefinitionSchema,
]);
export type ProblemDefinition = z.infer<typeof problemDefinitionSchema>;

export const problemDraftSchema = z.strictObject({
  id: z.uuid(),
  title: z.string().min(1).max(120),
  instructions: z.string().max(5000).nullable(),
  definition: problemDefinitionSchema,
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ProblemDraft = z.infer<typeof problemDraftSchema>;

export const problemVersionSchema = z.strictObject({
  id: z.uuid(),
  problemId: z.uuid(),
  version: z.number().int().positive().max(2147483647),
  title: z.string().min(1).max(120),
  instructions: z.string().max(5000).nullable(),
  definition: problemDefinitionSchema,
  publishedAt: z.iso.datetime(),
});
export type PublishedProblemVersion = z.infer<typeof problemVersionSchema>;

export const createProblemRequestSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  instructions: z.string().trim().max(5000).nullable().optional(),
  definition: problemDefinitionSchema,
});
export type CreateProblemRequest = z.infer<typeof createProblemRequestSchema>;

export const updateProblemRequestSchema = createProblemRequestSchema
  .partial()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    'Provide at least one draft field.',
  );
export type UpdateProblemRequest = z.infer<typeof updateProblemRequestSchema>;

export const problemParamsSchema = z.strictObject({ problemId: z.uuid() });
export type ProblemParams = z.infer<typeof problemParamsSchema>;
export const problemArchiveFilterSchema = z.enum(['active', 'archived', 'all']);
export type ProblemArchiveFilter = z.infer<typeof problemArchiveFilterSchema>;
export const problemListQuerySchema = z.strictObject({
  archive: problemArchiveFilterSchema.default('active'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ProblemListQuery = z.infer<typeof problemListQuerySchema>;

export const problemResponseSchema = z.strictObject({ problem: problemDraftSchema });
export type ProblemResponse = z.infer<typeof problemResponseSchema>;

export const problemListResponseSchema = z.strictObject({
  problems: z.array(problemDraftSchema),
  nextOffset: z.number().int().nonnegative().nullable(),
});
export type ProblemListResponse = z.infer<typeof problemListResponseSchema>;

export const problemErrorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: z.string(),
    message: z.string(),
    position: z.number().int().nonnegative().optional(),
  }),
});

export type ProblemErrorResponse = z.infer<typeof problemErrorResponseSchema>;

export const problemVersionParamsSchema = problemParamsSchema.extend({
  version: z.coerce.number().int().positive().max(2147483647),
});
export type ProblemVersionParams = z.infer<typeof problemVersionParamsSchema>;

export const problemVersionListQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ProblemVersionListQuery = z.infer<typeof problemVersionListQuerySchema>;
export const emptyProblemRequestSchema = z.strictObject({});
export type EmptyProblemRequest = z.infer<typeof emptyProblemRequestSchema>;

export const problemVersionResponseSchema = z.strictObject({ version: problemVersionSchema });
export type ProblemVersionResponse = z.infer<typeof problemVersionResponseSchema>;
export const problemVersionListResponseSchema = z.strictObject({
  versions: z.array(problemVersionSchema),
  nextOffset: z.number().int().nonnegative().nullable(),
});
export type ProblemVersionListResponse = z.infer<typeof problemVersionListResponseSchema>;
