import { problemErrorResponseSchema } from '@logiclab/contracts';

export const problemErrorResponses = {
  400: problemErrorResponseSchema,
  401: problemErrorResponseSchema,
  403: problemErrorResponseSchema,
  404: problemErrorResponseSchema,
  409: problemErrorResponseSchema,
  413: problemErrorResponseSchema,
  415: problemErrorResponseSchema,
  429: problemErrorResponseSchema,
  503: problemErrorResponseSchema,
};
