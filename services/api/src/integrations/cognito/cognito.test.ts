import { createHmac } from 'node:crypto';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  AdminDeleteUserCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { createCognitoProvider } from './cognito';
import { readAuthConfig } from '../../config/auth';

const config = readAuthConfig({
  AUTH_ENABLED: 'true',
  AWS_REGION: 'us-east-1',
  COGNITO_USER_POOL_ID: 'us-east-1_test',
  COGNITO_CLIENT_ID: 'client',
  COGNITO_CLIENT_SECRET: 'secret',
  AUTH_TOKEN_KEY: 'ab'.repeat(32),
  APP_ORIGIN: 'http://localhost:5173',
})!;
afterEach(() => jest.restoreAllMocks());

test('signup includes the server client secret hash and compensation targets the created subject', async () => {
  const send = jest.spyOn(CognitoIdentityProviderClient.prototype, 'send');
  send.mockResolvedValueOnce({ UserSub: 'subject' } as never).mockResolvedValueOnce({} as never);
  const provider = createCognitoProvider(config);
  expect(await provider.signup('person@example.com', 'password')).toBe('subject');
  expect(send.mock.calls[0]![0]).toBeInstanceOf(SignUpCommand);
  expect((send.mock.calls[0]![0] as SignUpCommand).input.SecretHash).toBe(
    createHmac('sha256', 'secret').update('person@example.comclient').digest('base64'),
  );
  await provider.deleteCreatedUser('subject');
  expect((send.mock.calls[1]![0] as AdminDeleteUserCommand).input).toMatchObject({
    Username: 'subject',
    UserPoolId: config.COGNITO_USER_POOL_ID,
  });
});
test('refresh hashes sub and retains the previous refresh token when Cognito omits a replacement', async () => {
  const send = jest
    .spyOn(CognitoIdentityProviderClient.prototype, 'send')
    .mockResolvedValue({ AuthenticationResult: { AccessToken: 'new', ExpiresIn: 900 } } as never);
  const provider = createCognitoProvider(config);
  expect(await provider.refresh('subject', 'refresh')).toEqual({
    accessToken: 'new',
    refreshToken: 'refresh',
    expiresIn: 900,
  });
  expect((send.mock.calls[0]![0] as InitiateAuthCommand).input).toMatchObject({
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    AuthParameters: {
      REFRESH_TOKEN: 'refresh',
      SECRET_HASH: createHmac('sha256', 'secret').update('subjectclient').digest('base64'),
    },
  });
});
test.each([
  { ChallengeName: 'NEW_PASSWORD_REQUIRED' },
  { AuthenticationResult: { AccessToken: 'partial' } },
])('does not treat an incomplete auth response as a login', async (result) => {
  jest.spyOn(CognitoIdentityProviderClient.prototype, 'send').mockResolvedValue(result as never);
  await expect(
    createCognitoProvider(config).login('person@example.com', 'password'),
  ).rejects.toThrow();
});
test('identity uses Cognito-authoritative verification instead of client assertions', async () => {
  jest.spyOn(CognitoIdentityProviderClient.prototype, 'send').mockResolvedValue({
    UserAttributes: [
      { Name: 'sub', Value: 'subject' },
      { Name: 'email_verified', Value: 'true' },
    ],
  } as never);
  expect(await createCognitoProvider(config).identity('access')).toEqual({
    subject: 'subject',
    verified: true,
  });
});

test('confirmation/resend/recovery commands include the server client secret hash', async () => {
  const send = jest
    .spyOn(CognitoIdentityProviderClient.prototype, 'send')
    .mockResolvedValue({} as never);
  const provider = createCognitoProvider(config);
  await provider.confirm('person@example.com', '123456');
  await provider.resend('person@example.com');
  await provider.forgotPassword('person@example.com');
  await provider.resetPassword('person@example.com', '654321', 'New-password1!');
  const types = [
    ConfirmSignUpCommand,
    ResendConfirmationCodeCommand,
    ForgotPasswordCommand,
    ConfirmForgotPasswordCommand,
  ];
  send.mock.calls.forEach(([command], index) => {
    expect(command).toBeInstanceOf(types[index]);
    expect((command as ConfirmSignUpCommand).input).toMatchObject({
      Username: 'person@example.com',
      SecretHash: createHmac('sha256', 'secret')
        .update('person@example.comclient')
        .digest('base64'),
    });
  });
  expect((send.mock.calls[3]![0] as ConfirmForgotPasswordCommand).input).toMatchObject({
    Password: 'New-password1!',
    ConfirmationCode: '654321',
  });
});
