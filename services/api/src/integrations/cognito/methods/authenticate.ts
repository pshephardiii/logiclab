import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoWrapper } from '../wrapper';
import type { Tokens } from '../../../application/auth/types';
import { AuthError } from '../../../application/auth/service';

/**
 * Validates login/refresh results and retains the previous refresh token when no replacement is returned.
 */
export async function authenticate(
  cognito: CognitoWrapper,
  flow: 'USER_PASSWORD_AUTH' | 'REFRESH_TOKEN_AUTH',
  parameters: Record<string, string>,
  previousRefresh?: string,
): Promise<Tokens> {
  const result = await cognito.send(new InitiateAuthCommand({
    ClientId: cognito.clientId,
    AuthFlow: flow,
    AuthParameters: parameters,
  }));
  if (result.ChallengeName) throw new AuthError('AUTH_CHALLENGE_UNSUPPORTED');

  const auth = result.AuthenticationResult;
  const refreshToken = auth?.RefreshToken ?? previousRefresh;
  if (!auth?.AccessToken || !refreshToken || !auth.ExpiresIn || auth.ExpiresIn <= 0) {
    throw new AuthError('AUTH_RESPONSE_INVALID');
  }
  return { accessToken: auth.AccessToken, refreshToken, expiresIn: auth.ExpiresIn };
}
