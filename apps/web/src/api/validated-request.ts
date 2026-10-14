import { requestJson, type RequestOptions } from './http-client';

export type ResponseSchema<T> = { parse: (payload: unknown) => T };

type ValidatedRequestOptions<T> = RequestOptions & {
  schema: ResponseSchema<T>;
  validationError?: (error: unknown) => Error;
};

/** Validate successful payloads, with an optional domain-specific validation error mapper. */
export async function requestValidatedJson<T>(path: string, {
  schema, validationError, ...requestOptions
}: ValidatedRequestOptions<T>): Promise<T> {
  const payload = await requestJson(path, requestOptions);
  try {
    return schema.parse(payload);
  } catch (error) {
    throw validationError ? validationError(error) : error;
  }
}
