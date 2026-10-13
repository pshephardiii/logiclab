import { RevokeTokenCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoWrapper } from '../wrapper';

export async function revoke(cognito: CognitoWrapper, refreshToken: string): Promise<void> {
  await cognito.send(new RevokeTokenCommand({
    ClientId: cognito.clientId,
    ClientSecret: cognito.clientSecret,
    Token: refreshToken,
  }));
}
