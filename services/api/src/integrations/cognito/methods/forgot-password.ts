import { ForgotPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoWrapper } from '../wrapper';

export async function forgotPassword(cognito: CognitoWrapper, email: string): Promise<void> {
  await cognito.send(new ForgotPasswordCommand({
    ClientId: cognito.clientId,
    Username: email,
    SecretHash: cognito.secretHash(email),
  }));
}
