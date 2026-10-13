import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { AuthConfig } from '../config/auth';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { readAuthConfig } from '../config/auth';
import { createCognitoProvider } from '../integrations/cognito/cognito';
import { createAuthStore } from '../persistence/auth/store';
import { createAuthService } from '../application/auth/service';
import { createClassroomStore } from '../persistence/classroom/store';
import type { AuthContext } from '../routes/auth/context';
import type { ClassroomContext } from '../routes/classroom/context';

export type ApplicationDependencies = {
  auth: AuthContext;
  classroom: ClassroomContext;
  close: () => Promise<void>;
};

type DependencyFactories = {
  connectDatabase: typeof createDatabase;
  createClient: (config: AuthConfig) => CognitoIdentityProviderClient;
  createAuthStore: typeof createAuthStore;
  createClassroomStore: typeof createClassroomStore;
};
const defaultFactories: DependencyFactories = {
  connectDatabase: async connectionString => (await import('@logiclab/db')).createDatabase(connectionString),
  createClient: config => new CognitoIdentityProviderClient({ region: config.AWS_REGION }),
  createAuthStore,
  createClassroomStore,
};

/** Application composition owns shared resources; auth-disabled practice needs none. */
export async function createDependencies(env: NodeJS.ProcessEnv, factories: DependencyFactories = defaultFactories): Promise<ApplicationDependencies | null> {
  const config = readAuthConfig(env);
  if (!config) return null;
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required when auth is enabled.');

  const orm = await factories.connectDatabase(env.DATABASE_URL);
  let client: CognitoIdentityProviderClient | undefined;
  try {
    client = factories.createClient(config);
    const store = await factories.createAuthStore(orm, config.COGNITO_USER_POOL_ID);
    const service = createAuthService(createCognitoProvider(config, client), store, config.AUTH_TOKEN_KEY);
    const classrooms = await factories.createClassroomStore(orm);

    return {
      auth: { config, service },
      classroom: { config, service, classrooms },
      close: async () => {
        try { await orm.close(true); } finally { client?.destroy(); }
      },
    };
  } catch (error) {
    try { await orm.close(true); } finally { client?.destroy(); }
    throw error;
  }
}
