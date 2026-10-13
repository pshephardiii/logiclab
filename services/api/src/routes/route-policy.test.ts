import { buildApp } from '../app';
import { classroomFixture, classroom } from '../../test/classroom-fixture';
import { sessionId } from '../../test/auth-fixture';
import { truthTableRequestSchema } from '@logiclab/contracts';
import { AuthError } from '../application/auth/service';

test('class schemas validate body, query and params with one authentication per request', async () => {
  const { context, service, classrooms, headers, user } = classroomFixture(); const app = buildApp({ auth: context, classroom: context });
  const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
  try {
    const created = await app.inject({ method: 'POST', url: '/api/classes', headers: authenticated, payload: { name: '  Logic  ' } });
    expect(created.statusCode).toBe(201); expect(classrooms.create).toHaveBeenCalledWith(user.id, 'Logic');
    expect(service.authenticate).toHaveBeenCalledTimes(1);
    const listed = await app.inject({ method: 'GET', url: '/api/classes?limit=1&offset=2', headers: authenticated });
    expect(listed.statusCode).toBe(200); expect(classrooms.list).toHaveBeenCalledWith(user.id, 2, 2);
    expect(service.authenticate).toHaveBeenCalledTimes(2);
    expect((await app.inject({ method: 'GET', url: '/api/classes/not-a-uuid', headers: authenticated })).statusCode).toBe(400);
    expect(classrooms.findOwned).not.toHaveBeenCalled();
    expect((await app.inject({ method: 'GET', url: '/api/classes?limit=51', headers: authenticated })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/classes', headers: authenticated, payload: { name: 'Logic', ownerId: user.id } })).statusCode).toBe(400);
  } finally { await app.close(); }
});

test('class authorization still precedes field validation', async () => {
  const { context, service, user, headers } = classroomFixture(); const app = buildApp({ auth: context, classroom: context });
  try {
    const request = { method: 'GET' as const, url: '/api/classes/not-a-uuid' };
    expect((await app.inject(request)).statusCode).toBe(401);
    service.authenticate.mockResolvedValue({ ...user, role: 'student' });
    expect((await app.inject({ ...request, headers: { cookie: `logiclab_session=${sessionId}` } })).statusCode).toBe(403);
    service.authenticate.mockRejectedValueOnce(new AuthError('SESSION_EXPIRED'));
    expect((await app.inject({ ...request, headers: { cookie: `logiclab_session=${sessionId}` } })).statusCode).toBe(401);
    service.authenticate.mockResolvedValue({ ...user, role: 'instructor' });
    expect((await app.inject({ method: 'POST', url: '/api/enrollments', headers: { ...headers, cookie: `logiclab_session=${sessionId}` }, payload: { code: 'bad' } })).statusCode).toBe(403);
  } finally { await app.close(); }
});

test('class response serialization cannot leak undeclared invitation fields', async () => {
  const { context, headers } = classroomFixture(); const app = buildApp({ auth: context, classroom: context });
  app.addHook('onRoute', route => {
    if (route.url === '/api/classes/:classId') route.handler = async () => ({ classroom: { ...classroom, invitationHash: 'private-hash' } });
  });
  try {
    const response = await app.inject({ method: 'GET', url: `/api/classes/${classroom.id}`, headers: { ...headers, cookie: `logiclab_session=${sessionId}` } });
    expect(response.statusCode).toBe(503); expect(response.body).not.toContain('private-hash');
  } finally { await app.close(); }
});

test('class reads and mutations retain defaults while practice and health remain unthrottled', async () => {
  const { context, headers } = classroomFixture(); const app = buildApp({ auth: context, classroom: context });
  try {
    const created = await app.inject({ method: 'POST', url: '/api/classes', headers: { ...headers, cookie: `logiclab_session=${sessionId}` }, payload: { name: 'Logic' } });
    expect(created.headers['x-ratelimit-limit']).toBe('10'); expect(Number(created.headers['x-ratelimit-reset'])).toBeGreaterThan(60);
    const listed = await app.inject({ method: 'GET', url: '/api/classes', headers: { cookie: `logiclab_session=${sessionId}` } });
    expect(listed.headers['x-ratelimit-limit']).toBe('60'); expect(Number(listed.headers['x-ratelimit-reset'])).toBeLessThanOrEqual(60);
    const practice = await app.inject({ method: 'POST', url: '/api/truth-tables/exercise', payload: { formula: 'P' } });
    expect(practice.statusCode).toBe(200); expect(practice.headers['x-ratelimit-limit']).toBeUndefined();
    const health = await app.inject({ method: 'GET', url: '/api/health' });
    expect(health.statusCode).toBe(200); expect(health.headers['x-ratelimit-limit']).toBeUndefined();
  } finally { await app.close(); }
});

test('practice route validation retains the existing Zod issue message', async () => {
  const app = buildApp(); const body = { formula: 42 }; const parsed = truthTableRequestSchema.safeParse(body);
  if (parsed.success) throw new Error('Fixture must be invalid');
  try {
    const response = await app.inject({ method: 'POST', url: '/api/truth-tables/exercise', payload: body });
    expect(response.statusCode).toBe(400); expect(response.json()).toEqual({ error: { code: 'INVALID_REQUEST', message: parsed.error.message } });
  } finally { await app.close(); }
});
