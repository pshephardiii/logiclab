import { createClassroomStore } from '../classroom/store';
import { readAuthConfig } from './config';
import { createCognitoProvider } from './cognito';
import { createAuthStore } from './store';
import { createAuthService } from './service';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

/** Enabled only by backend configuration; anonymous practice stays independent. */
export async function createAuthFoundation(env: NodeJS.ProcessEnv) {
  const config = readAuthConfig(env);
  if (!config) return null;
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required when auth is enabled.');
  const { createDatabase } = await import('@logiclab/db');
  const orm = await createDatabase(env.DATABASE_URL);
  const client = new CognitoIdentityProviderClient({ region: config.AWS_REGION });
  try {
    const store = await createAuthStore(orm, config.COGNITO_USER_POOL_ID);
    return { config, classrooms: await createClassroomStore(orm), service: createAuthService(createCognitoProvider(config, client), store, config.AUTH_TOKEN_KEY), close: async () => {
      try { await orm.close(true); } finally { client.destroy(); }
    } };
  } catch (error) { client.destroy(); await orm.close(true); throw error; }
}
