import { AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoWrapper } from '../wrapper';

export async function deleteCreatedUser(cognito: CognitoWrapper, subject: string): Promise<void> {
  await cognito.send(new AdminDeleteUserCommand({
    UserPoolId: cognito.poolId,
    Username: subject,
  }));
}
