import { classroomFixture } from './classroom-fixture';
import { sessionId } from './auth-fixture';
import { buildApp } from '../src/app';

const app = buildApp();
afterAll(async () => {
  await app.close();
});

test('unknown routes return 404', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/missing' });
  expect(response.statusCode).toBe(404);
});

test('auth and classroom route registration use independent dependency options', async () => {
  const { context } = classroomFixture();
  const authOnly = buildApp({ auth: context });
  const classroomOnly = buildApp({ classroom: context });
  try {
    const headers = { cookie: `logiclab_session=${sessionId}` };
    expect(
      (await authOnly.inject({ method: 'GET', url: '/api/auth/session', headers })).statusCode,
    ).toBe(200);
    expect(
      (await authOnly.inject({ method: 'GET', url: '/api/classes', headers })).statusCode,
    ).toBe(404);
    expect(
      (await classroomOnly.inject({ method: 'GET', url: '/api/classes', headers })).statusCode,
    ).toBe(200);
    expect(
      (await classroomOnly.inject({ method: 'GET', url: '/api/auth/session', headers })).statusCode,
    ).toBe(404);
  } finally {
    await authOnly.close();
    await classroomOnly.close();
  }
});
