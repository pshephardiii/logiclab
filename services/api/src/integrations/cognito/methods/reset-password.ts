import { ConfirmForgotPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoWrapper } from '../wrapper';

export async function resetPassword(cognito: CognitoWrapper, email: string, code: string, password: string): Promise<void> {
  await cognito.send(new ConfirmForgotPasswordCommand({
    ClientId: cognito.clientId,
    Username: email,
    SecretHash: cognito.secretHash(email),
    ConfirmationCode: code,
    Password: password,
  }));
}
