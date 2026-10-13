import { ResendConfirmationCodeCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoWrapper } from '../wrapper';

export async function resend(cognito: CognitoWrapper, email: string): Promise<void> {
  await cognito.send(new ResendConfirmationCodeCommand({
    ClientId: cognito.clientId,
    Username: email,
    SecretHash: cognito.secretHash(email),
  }));
}
