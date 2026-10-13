import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { AuthStore } from '../application/auth/types';
import type { ClassroomStore } from '../persistence/classroom/store';
import { createDependencies } from './dependencies';

const closeDatabase = jest.fn(async () => {});
const destroyClient = jest.fn();
const orm = { close: closeDatabase } as unknown as Awaited<ReturnType<typeof createDatabase>>;
const connect = jest.fn(async () => orm);
const ClientConstructor = jest.fn(() => ({ destroy: destroyClient }) as unknown as CognitoIdentityProviderClient);
const authStore = jest.fn(async () => ({} as AuthStore));
const classroomStore = jest.fn(async () => ({} as ClassroomStore));
const factories = { connectDatabase: connect, createClient: ClientConstructor, createAuthStore: authStore, createClassroomStore: classroomStore };

const env = {
  AUTH_ENABLED: 'true', AWS_REGION: 'us-east-1', COGNITO_USER_POOL_ID: 'us-east-1_test',
  COGNITO_CLIENT_ID: 'client', COGNITO_CLIENT_SECRET: 'synthetic-secret',
  AUTH_TOKEN_KEY: 'ab'.repeat(32), APP_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://synthetic/test',
};
beforeEach(() => {
  closeDatabase.mockReset().mockResolvedValue(undefined);
  destroyClient.mockReset();connect.mockReset().mockResolvedValue(orm);
  ClientConstructor.mockReset().mockImplementation(() => ({ destroy: destroyClient }) as unknown as CognitoIdentityProviderClient);
  authStore.mockReset().mockResolvedValue({} as never);
  classroomStore.mockReset().mockResolvedValue({} as never);
});

test('disabled auth does not allocate external resources', async () => {
  expect(await createDependencies({ AUTH_ENABLED: 'false' }, factories)).toBeNull();
  expect(connect).not.toHaveBeenCalled();expect(ClientConstructor).not.toHaveBeenCalled();
});
test('missing database settings fail before opening resources', async () => {
  await expect(createDependencies({ ...env, DATABASE_URL: undefined }, factories)).rejects.toThrow('DATABASE_URL is required');
  expect(connect).not.toHaveBeenCalled();
});
test('constructs separate route dependencies using one database and auth service', async () => {
  const dependencies = await createDependencies(env, factories);expect(dependencies).not.toBeNull();
  expect(connect).toHaveBeenCalledTimes(1);
  expect(authStore).toHaveBeenCalledWith(orm, env.COGNITO_USER_POOL_ID);
  expect(classroomStore).toHaveBeenCalledWith(orm);
  expect(dependencies!.classroom.service).toBe(dependencies!.auth.service);
  expect(dependencies!.auth).not.toHaveProperty('classrooms');
  await dependencies!.close();expect(closeDatabase).toHaveBeenCalledWith(true);expect(destroyClient).toHaveBeenCalledTimes(1);
});
test('failed initialization closes shared resources', async () => {
  classroomStore.mockRejectedValueOnce(new Error('Initialization failed'));
  await expect(createDependencies(env, factories)).rejects.toThrow('Initialization failed');
  expect(closeDatabase).toHaveBeenCalledWith(true);expect(destroyClient).toHaveBeenCalledTimes(1);
});
test('shutdown still destroys the provider client if database closing fails', async () => {
  const dependencies = await createDependencies(env, factories);closeDatabase.mockRejectedValueOnce(new Error('Close failed'));
  await expect(dependencies!.close()).rejects.toThrow('Close failed');expect(destroyClient).toHaveBeenCalledTimes(1);
});
test('client construction failure still closes the already-open database', async () => {
  ClientConstructor.mockImplementationOnce(() => { throw new Error('Client failed'); });
  await expect(createDependencies(env, factories)).rejects.toThrow('Client failed');expect(closeDatabase).toHaveBeenCalledWith(true);
});
