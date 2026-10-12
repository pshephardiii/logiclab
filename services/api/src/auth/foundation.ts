import { readAuthConfig } from './config';
import { createCognitoProvider } from './cognito';
import { createAuthStore } from './store';
import { createAuthService } from './service';

/** Prepared for the auth route plugin; existing anonymous practice stays independent. */
export async function createAuthFoundation(env: NodeJS.ProcessEnv) {
  const config = readAuthConfig(env);
  if (!config) return null;
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required when auth is enabled.');
  const { createDatabase } = await import('@logiclab/db');
  const orm = await createDatabase(env.DATABASE_URL);
  try {
    const store = await createAuthStore(orm, config.COGNITO_USER_POOL_ID);
    return { config, service: createAuthService(createCognitoProvider(config), store, config.AUTH_TOKEN_KEY), close: () => orm.close(true) };
  } catch (error) { await orm.close(true); throw error; }
}
