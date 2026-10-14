import { z } from 'zod';

const configSchema = z
  .object({
    AWS_REGION: z.literal('us-east-1'),
    COGNITO_USER_POOL_ID: z.string().regex(/^us-east-1_[A-Za-z0-9]+$/),
    COGNITO_CLIENT_ID: z.string().min(1),
    COGNITO_CLIENT_SECRET: z.string().min(1),
    AUTH_TOKEN_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
    APP_ORIGIN: z.url(),
  })
  .superRefine((value, context) => {
    const origin = new URL(value.APP_ORIGIN);
    if (origin.origin !== value.APP_ORIGIN || !['http:', 'https:'].includes(origin.protocol)) {
      context.addIssue({
        code: 'custom',
        path: ['APP_ORIGIN'],
        message: 'Use an exact HTTP(S) origin without a path.',
      });
    }
  });
export type AuthConfig = z.infer<typeof configSchema> & { secureCookies: boolean };

/**
 * Validates enabled-auth settings and derives cookie policy; returns null when auth is disabled.
 */
export function readAuthConfig(env: NodeJS.ProcessEnv): AuthConfig | null {
  if (env.AUTH_ENABLED === undefined || env.AUTH_ENABLED === 'false') return null;
  if (env.AUTH_ENABLED !== 'true') throw new Error('AUTH_ENABLED must be true or false.');
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid auth configuration: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  }
  const secureCookies = new URL(parsed.data.APP_ORIGIN).protocol === 'https:';
  if (
    !secureCookies &&
    (env.NODE_ENV === 'production' ||
      !['localhost', '127.0.0.1'].includes(new URL(parsed.data.APP_ORIGIN).hostname))
  ) {
    throw new Error('Authentication requires HTTPS outside localhost development.');
  }
  return { ...parsed.data, secureCookies };
}
