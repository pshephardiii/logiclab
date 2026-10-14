import { GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoWrapper } from '../wrapper';
import { AuthError } from '../../../application/auth/service';

/**
 * Reads the authoritative subject and email-verification status from the access token via Cognito.
 */
export async function identity(
  cognito: CognitoWrapper,
  accessToken: string,
): Promise<{ subject: string; verified: boolean }> {
  const result = await cognito.send(new GetUserCommand({ AccessToken: accessToken }));
  const subject = result.UserAttributes?.find((attribute) => attribute.Name === 'sub')?.Value;
  if (!subject) throw new AuthError('AUTH_RESPONSE_INVALID');
  return {
    subject,
    verified:
      result.UserAttributes?.some(
        (attribute) => attribute.Name === 'email_verified' && attribute.Value === 'true',
      ) ?? false,
  };
}
