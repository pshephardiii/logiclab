import { ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoWrapper } from '../wrapper';

export async function confirm(cognito: CognitoWrapper, email: string, code: string): Promise<void> {
  await cognito.send(
    new ConfirmSignUpCommand({
      ClientId: cognito.clientId,
      Username: email,
      SecretHash: cognito.secretHash(email),
      ConfirmationCode: code,
    }),
  );
}
