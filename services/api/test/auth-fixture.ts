import type { AppUser } from '../src/application/auth/types';
import { readAuthConfig } from '../src/config/auth';
import type { AuthContext } from '../src/routes/auth/context';

export const authUser = { id: 'f7c46ac4-a994-4543-9548-ea080a70e0c0', subject: 'private-subject', role: 'instructor' as const };
export const sessionId = 'x'.repeat(43);
export const password = 'Example-password1!';

export function authFixture() {
  const config = readAuthConfig({ AUTH_ENABLED: 'true', AWS_REGION: 'us-east-1', COGNITO_USER_POOL_ID: 'us-east-1_test', COGNITO_CLIENT_ID: 'client', COGNITO_CLIENT_SECRET: 'secret', AUTH_TOKEN_KEY: 'ab'.repeat(32), APP_ORIGIN: 'http://localhost:5173' })!;
  const service = {
    signup: jest.fn(async () => authUser),
    login: jest.fn(async () => ({ sessionId, maxAge: 604800, user: authUser })),
    authenticate: jest.fn(async (): Promise<AppUser> => authUser), logout: jest.fn(async () => {}),
    confirm: jest.fn(async () => {}), resend: jest.fn(async () => {}),
    forgotPassword: jest.fn(async () => {}), resetPassword: jest.fn(async () => {}),
  };
  const context: AuthContext = { config, service };
  return { context, service, headers: { origin: config.APP_ORIGIN } };
}
