import { SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoWrapper } from '../wrapper';
import { AuthError } from '../../../application/auth/service';

export async function signup(
  cognito: CognitoWrapper,
  email: string,
  password: string,
): Promise<string> {
  const result = await cognito.send(
    new SignUpCommand({
      ClientId: cognito.clientId,
      Username: email,
      Password: password,
      SecretHash: cognito.secretHash(email),
      UserAttributes: [{ Name: 'email', Value: email }],
    }),
  );
  if (!result.UserSub) throw new AuthError('AUTH_RESPONSE_INVALID');
  return result.UserSub;
}
