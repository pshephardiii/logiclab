import {
  authErrorResponseSchema,
  studentWorkErrorResponseSchema,
  assignmentErrorResponseSchema,
  problemErrorResponseSchema,
  truthTableErrorResponseSchema,
} from '@logiclab/contracts';

/** Associate each declared status with its group's response contract. */
function errorResponses<Schema, const Statuses extends readonly number[]>(
  schema: Schema,
  statuses: Statuses,
): Record<Statuses[number], Schema> {
  return Object.fromEntries(statuses.map((status) => [status, schema])) as Record<
    Statuses[number],
    Schema
  >;
}

export const authErrorResponses = errorResponses(
  authErrorResponseSchema,
  [400, 401, 403, 413, 415, 429, 503],
);

export const classroomErrorResponses = errorResponses(
  authErrorResponseSchema,
  [400, 401, 403, 404, 413, 415, 429, 503],
);

export const problemErrorResponses = errorResponses(
  problemErrorResponseSchema,
  [400, 401, 403, 404, 409, 413, 415, 429, 503],
);

export const assignmentErrorResponses = errorResponses(
  assignmentErrorResponseSchema,
  [400, 401, 403, 404, 409, 413, 415, 429, 503],
);

// Public practice has no account policy; preserve its existing declared response statuses.
export const truthTableErrorResponses = errorResponses(truthTableErrorResponseSchema, [400]);

export const studentWorkErrorResponses = errorResponses(
  studentWorkErrorResponseSchema,
  [400, 401, 403, 404, 409, 413, 415, 429, 503],
);
