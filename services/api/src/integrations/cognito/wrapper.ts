import { createHmac } from 'node:crypto';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { AuthConfig } from '../../config/auth';

/**
 * Shares typed SDK dispatch and client-secret hashing; resource cleanup belongs to bootstrap.
 */
export function createCognitoWrapper(
  config: AuthConfig,
  client = new CognitoIdentityProviderClient({ region: config.AWS_REGION }),
) {
  return {
    clientId: config.COGNITO_CLIENT_ID,
    poolId: config.COGNITO_USER_POOL_ID,
    clientSecret: config.COGNITO_CLIENT_SECRET,
    send: client.send.bind(client),
    secretHash(username: string): string {
      return createHmac('sha256', config.COGNITO_CLIENT_SECRET)
        .update(username + config.COGNITO_CLIENT_ID)
        .digest('base64');
    },
  };
}

export type CognitoWrapper = ReturnType<typeof createCognitoWrapper>;
