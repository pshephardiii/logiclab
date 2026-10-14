import type { RouteSchema } from '../setup';
import { authErrorResponseSchema } from '@logiclab/contracts';

export type AuthRouteSchema = RouteSchema;

export const authErrorResponses = {
  400: authErrorResponseSchema,
  401: authErrorResponseSchema,
  403: authErrorResponseSchema,
  413: authErrorResponseSchema,
  415: authErrorResponseSchema,
  429: authErrorResponseSchema,
  503: authErrorResponseSchema,
};
