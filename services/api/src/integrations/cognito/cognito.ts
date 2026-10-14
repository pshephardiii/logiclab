import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { AuthConfig } from '../../config/auth';
import type { IdentityProvider } from '../../application/auth/types';
import { createCognitoWrapper } from './wrapper';
import {
  signup,
  deleteCreatedUser,
  login,
  refresh,
  identity,
  revoke,
  confirm,
  resend,
  forgotPassword,
  resetPassword,
} from './methods';

/**
 * Assembles the application identity interface from Cognito operations using one shared SDK wrapper.
 */
export function createCognitoProvider(
  config: AuthConfig,
  client?: CognitoIdentityProviderClient,
): IdentityProvider {
  const cognito = createCognitoWrapper(config, client);
  return {
    signup: (email, password) => signup(cognito, email, password),
    deleteCreatedUser: (subject) => deleteCreatedUser(cognito, subject),
    login: (email, password) => login(cognito, email, password),
    refresh: (subject, refreshToken) => refresh(cognito, subject, refreshToken),
    identity: (accessToken) => identity(cognito, accessToken),
    revoke: (refreshToken) => revoke(cognito, refreshToken),
    confirm: (email, code) => confirm(cognito, email, code),
    resend: (email) => resend(cognito, email),
    forgotPassword: (email) => forgotPassword(cognito, email),
    resetPassword: (email, code, password) => resetPassword(cognito, email, code, password),
  };
}
