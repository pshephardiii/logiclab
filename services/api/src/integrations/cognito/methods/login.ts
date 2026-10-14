import type { CognitoWrapper } from '../wrapper';
import type { Tokens } from '../../../application/auth/types';
import { authenticate } from './authenticate';

export function login(cognito: CognitoWrapper, email: string, password: string): Promise<Tokens> {
  return authenticate(cognito, 'USER_PASSWORD_AUTH', {
    USERNAME: email,
    PASSWORD: password,
    SECRET_HASH: cognito.secretHash(email),
  });
}
