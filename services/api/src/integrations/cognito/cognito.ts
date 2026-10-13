import { createHmac } from 'node:crypto';
import {
  CognitoIdentityProviderClient, SignUpCommand, AdminDeleteUserCommand,
  InitiateAuthCommand, GetUserCommand, RevokeTokenCommand,
  ConfirmSignUpCommand, ResendConfirmationCodeCommand, ForgotPasswordCommand, ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { AuthConfig } from '../../config/auth';
import type { IdentityProvider, Tokens } from '../../application/auth/types';
import { AuthError } from '../../application/auth/service';

export function createCognitoProvider(config: AuthConfig, client = new CognitoIdentityProviderClient({ region: config.AWS_REGION })) : IdentityProvider {
  const secretHash = (username: string) => createHmac('sha256', config.COGNITO_CLIENT_SECRET)
    .update(username + config.COGNITO_CLIENT_ID).digest('base64');
  async function authenticate(flow: 'USER_PASSWORD_AUTH' | 'REFRESH_TOKEN_AUTH', parameters: Record<string, string>, previousRefresh?: string): Promise<Tokens> {
    const result = await client.send(new InitiateAuthCommand({ ClientId: config.COGNITO_CLIENT_ID, AuthFlow: flow, AuthParameters: parameters }));
    if (result.ChallengeName) throw new AuthError('AUTH_CHALLENGE_UNSUPPORTED');
    const auth = result.AuthenticationResult;
    if (!auth?.AccessToken || !(auth.RefreshToken ?? previousRefresh) || !auth.ExpiresIn || auth.ExpiresIn <= 0) throw new AuthError('AUTH_RESPONSE_INVALID');
    return { accessToken: auth.AccessToken, refreshToken: auth.RefreshToken ?? previousRefresh!, expiresIn: auth.ExpiresIn };
  }
  return {
    async signup(email, password) {
      const result = await client.send(new SignUpCommand({ ClientId: config.COGNITO_CLIENT_ID, Username: email, Password: password,
        SecretHash: secretHash(email), UserAttributes: [{ Name: 'email', Value: email }] }));
      if (!result.UserSub) throw new AuthError('AUTH_RESPONSE_INVALID');
      return result.UserSub;
    },
    async deleteCreatedUser(subject) {
      await client.send(new AdminDeleteUserCommand({ UserPoolId: config.COGNITO_USER_POOL_ID, Username: subject }));
    },
    login(email, password) {
      return authenticate('USER_PASSWORD_AUTH', { USERNAME: email, PASSWORD: password, SECRET_HASH: secretHash(email) });
    },
    refresh(subject, refreshToken) {
      // Email-only sign-in pools require sub for the refresh secret hash.
      return authenticate('REFRESH_TOKEN_AUTH', { REFRESH_TOKEN: refreshToken, SECRET_HASH: secretHash(subject) }, refreshToken);
    },
    async identity(accessToken) {
      const result = await client.send(new GetUserCommand({ AccessToken: accessToken }));
      const subject = result.UserAttributes?.find(attribute => attribute.Name === 'sub')?.Value;
      if (!subject) throw new AuthError('AUTH_RESPONSE_INVALID');
      return { subject, verified: result.UserAttributes?.some(attribute => attribute.Name === 'email_verified' && attribute.Value === 'true') ?? false };
    },
    async revoke(refreshToken) {
      await client.send(new RevokeTokenCommand({ ClientId: config.COGNITO_CLIENT_ID, ClientSecret: config.COGNITO_CLIENT_SECRET, Token: refreshToken }));
    },
    async confirm(email, code) {
      await client.send(new ConfirmSignUpCommand({ ClientId: config.COGNITO_CLIENT_ID, Username: email, SecretHash: secretHash(email), ConfirmationCode: code }));
    },
    async resend(email) {
      await client.send(new ResendConfirmationCodeCommand({ ClientId: config.COGNITO_CLIENT_ID, Username: email, SecretHash: secretHash(email) }));
    },
    async forgotPassword(email) {
      await client.send(new ForgotPasswordCommand({ ClientId: config.COGNITO_CLIENT_ID, Username: email, SecretHash: secretHash(email) }));
    },
    async resetPassword(email, code, password) {
      await client.send(new ConfirmForgotPasswordCommand({ ClientId: config.COGNITO_CLIENT_ID, Username: email, SecretHash: secretHash(email), ConfirmationCode: code, Password: password }));
    },
  };
}
