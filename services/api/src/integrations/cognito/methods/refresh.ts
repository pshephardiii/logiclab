import type { CognitoWrapper } from '../wrapper';
import type { Tokens } from '../../../application/auth/types';
import { authenticate } from './authenticate';

export function refresh(
  cognito: CognitoWrapper,
  subject: string,
  refreshToken: string,
): Promise<Tokens> {
  // Email-only sign-in pools require sub for the refresh secret hash.
  return authenticate(
    cognito,
    'REFRESH_TOKEN_AUTH',
    {
      REFRESH_TOKEN: refreshToken,
      SECRET_HASH: cognito.secretHash(subject),
    },
    refreshToken,
  );
}
