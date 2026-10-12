import { createAuthService, AuthError } from './service';
import { sessionHash, decryptTokens, encryptTokens } from './crypto';
import { readAuthConfig } from './config';
import type { AuthStore, IdentityProvider, StoredSession } from './types';

const key = 'ab'.repeat(32);
const user = { id: 'app-id', subject: 'subject', role: 'instructor' as const };
const tokens = { accessToken: 'private-access', refreshToken: 'private-refresh', expiresIn: 900 };
function setup() {
  const sessions = new Map<string, StoredSession>();
  const provider: IdentityProvider = {
    signup: jest.fn(async () => 'subject'), deleteCreatedUser: jest.fn(async () => {}),
    login: jest.fn(async () => tokens), refresh: jest.fn(async () => ({ ...tokens, accessToken: 'new-access' })),
    confirm: jest.fn(async () => {}), resend: jest.fn(async () => {}), forgotPassword: jest.fn(async () => {}), resetPassword: jest.fn(async () => {}),
    identity: jest.fn(async () => ({ subject: 'subject', verified: true })), revoke: jest.fn(async () => {}),
  };
  const store: AuthStore = {
    deleteSessionsForEmail: jest.fn(async () => { sessions.clear(); }),
    createUser: jest.fn(async (subject, role) => ({ id: 'app-id', subject, role })), findUser: jest.fn(async () => user),
    saveSession: jest.fn(async (id, value) => { sessions.set(id, value); }),
    updateSession: jest.fn(async (id, value) => { if (!sessions.has(id)) return false; sessions.set(id, value); return true; }),
    getSession: jest.fn(async id => sessions.get(id) ?? null), deleteSession: jest.fn(async id => { sessions.delete(id); }),
  };
  let clock = 1000;
  return { provider, store, sessions, service: createAuthService(provider, store, key, () => clock), advance: (ms: number) => { clock += ms; } };
}

test('signup persists the selected role against the new Cognito subject', async () => {
  const { service, store } = setup();
  expect(await service.signup('person@example.com', 'password', 'student')).toMatchObject({ subject: 'subject', role: 'student' });
  expect(store.createUser).toHaveBeenCalledWith('subject', 'student', 'person@example.com');
});
test('Cognito rejection does not create a local user or delete an existing identity', async () => {
  const { service, provider, store } = setup();
  jest.mocked(provider.signup).mockRejectedValue(new Error('UsernameExists'));
  await expect(service.signup('person@example.com', 'password', 'student')).rejects.toThrow('UsernameExists');
  expect(store.createUser).not.toHaveBeenCalled(); expect(provider.deleteCreatedUser).not.toHaveBeenCalled();
});
test('storage failure compensates only the newly created identity', async () => {
  const { service, provider, store } = setup();
  jest.mocked(store.createUser).mockRejectedValue(new Error('storage'));
  await expect(service.signup('person@example.com', 'password', 'student')).rejects.toMatchObject({ code: 'SIGNUP_RETRY_REQUIRED' });
  expect(provider.deleteCreatedUser).toHaveBeenCalledWith('subject');
});
test('failed compensation explicitly requires reconciliation', async () => {
  const { service, provider, store } = setup();
  jest.mocked(store.createUser).mockRejectedValue(new Error('storage'));
  jest.mocked(provider.deleteCreatedUser).mockRejectedValue(new Error('AWS'));
  await expect(service.signup('person@example.com', 'password', 'student')).rejects.toMatchObject({ code: 'SIGNUP_RECONCILIATION_REQUIRED' });
});
test('login uses the stored role and exposes no Cognito tokens', async () => {
  const { service, sessions, store } = setup();
  const login = await service.login('person@example.com', 'password');
  expect(login.user.role).toBe('instructor'); expect(store.createUser).not.toHaveBeenCalled();
  expect(JSON.stringify(login)).not.toContain('private-');
  const hash = sessionHash(login.sessionId); const stored = sessions.get(hash)!;
  expect(sessions.has(login.sessionId)).toBe(false);
  expect(stored.encryptedTokens).not.toContain('private-');
  expect(decryptTokens(stored.encryptedTokens, key, hash)).toEqual(tokens);
});
test.each(['unverified', 'missing'])('login rejects %s account without issuing a session', async kind => {
  const { service, provider, store, sessions } = setup();
  if (kind === 'unverified') jest.mocked(provider.identity).mockResolvedValue({ subject: 'subject', verified: false });
  else jest.mocked(store.findUser).mockResolvedValue(null);
  await expect(service.login('person@example.com', 'password')).rejects.toBeInstanceOf(AuthError);
  expect(sessions.size).toBe(0);
});
test('session survives API service recreation and refresh preserves its absolute expiry', async () => {
  const { service, sessions, provider, store, advance } = setup();
  const login = await service.login('person@example.com', 'password');
  const hash = sessionHash(login.sessionId); const expiry = sessions.get(hash)!.expiresAt;
  advance(901000);
  expect(await service.authenticate(login.sessionId)).toEqual(user);
  expect(provider.refresh).toHaveBeenCalledWith('subject', 'private-refresh');
  expect(sessions.get(hash)!.expiresAt).toEqual(expiry);
  const restarted = createAuthService(provider, store, key, () => 902000);
  expect(await restarted.authenticate(login.sessionId)).toEqual(user);
});
test('expired and malformed sessions are rejected', async () => {
  const { service, advance, sessions } = setup(); const login = await service.login('person@example.com', 'password');
  advance(7 * 86400 * 1000);
  await expect(service.authenticate(login.sessionId)).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
  expect(sessions.size).toBe(0);
  await expect(service.authenticate('malformed')).rejects.toMatchObject({ code: 'SESSION_INVALID' });
});
test('logout deletes the session before provider revocation, even if revocation fails', async () => {
  const { service, sessions, provider } = setup(); const login = await service.login('person@example.com', 'password');
  jest.mocked(provider.revoke).mockRejectedValue(new Error('unavailable'));
  await expect(service.logout(login.sessionId)).rejects.toThrow(); expect(sessions.size).toBe(0);
});
test('refresh cannot recreate a session deleted concurrently', async () => {
  const { service, store, advance } = setup(); const login = await service.login('person@example.com', 'password'); advance(901000);
  jest.mocked(store.updateSession).mockResolvedValue(false);
  await expect(service.authenticate(login.sessionId)).rejects.toMatchObject({ code: 'SESSION_INVALID' });
});
test('encrypted tokens cannot be moved between sessions or read with a different key', () => {
  const value = encryptTokens(tokens, key, 'first');
  expect(() => decryptTokens(value, key, 'second')).toThrow();
  expect(() => decryptTokens(value, 'cd'.repeat(32), 'first')).toThrow();
});
test('auth is opt-in and invalid configuration errors contain no secret values', () => {
  expect(readAuthConfig({})).toBeNull();
  expect(() => readAuthConfig({ AUTH_ENABLED: 'maybe' })).toThrow();
  expect(() => readAuthConfig({ AUTH_ENABLED: 'true', AUTH_TOKEN_KEY: 'private-key' })).toThrow('AUTH_TOKEN_KEY');
  try { readAuthConfig({ AUTH_ENABLED: 'true', AUTH_TOKEN_KEY: 'private-key' }); }
  catch (error) { expect(String(error)).not.toContain('private-key'); }
});
test('secure configuration rejects production HTTP and permits localhost development', () => {
  const env = { AUTH_ENABLED: 'true', AWS_REGION: 'us-east-1', COGNITO_USER_POOL_ID: 'us-east-1_example', COGNITO_CLIENT_ID: 'client', COGNITO_CLIENT_SECRET: 'secret', AUTH_TOKEN_KEY: key, APP_ORIGIN: 'http://localhost:5173' };
  expect(readAuthConfig(env)?.secureCookies).toBe(false);
  expect(() => readAuthConfig({ ...env, NODE_ENV: 'production' })).toThrow('HTTPS');
  expect(readAuthConfig({ ...env, APP_ORIGIN: 'https://example.com', NODE_ENV: 'production' })?.secureCookies).toBe(true);
});

test('successful password reset invalidates all local sessions for the normalized email', async () => {
  const { service, provider, store, sessions } = setup();
  await service.login('person@example.com', 'password');
  await service.resetPassword('person@example.com', '123456', 'New-password1!');
  expect(provider.resetPassword).toHaveBeenCalledWith('person@example.com', '123456', 'New-password1!');
  expect(store.deleteSessionsForEmail).toHaveBeenCalledWith('person@example.com');
  expect(sessions.size).toBe(0);
});

test('invalid reset code leaves current local sessions intact', async () => {
  const { service, provider, store, sessions } = setup();
  await service.login('person@example.com', 'password');
  jest.mocked(provider.resetPassword).mockRejectedValue(new Error('invalid code'));
  await expect(service.resetPassword('person@example.com', '000000', 'New-password1!')).rejects.toThrow();
  expect(store.deleteSessionsForEmail).not.toHaveBeenCalled(); expect(sessions.size).toBe(1);
});
