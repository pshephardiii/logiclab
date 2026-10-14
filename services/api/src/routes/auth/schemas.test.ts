import type { FastifyRequest, FastifyReply } from 'fastify';
import type { SignupRequest } from '@logiclab/contracts';
import { buildApp } from '../../app';
import { authFixture, password } from '../../../test/auth-fixture';

test('route validation normalizes email before the handler and blocks invalid fields', async () => {
  const { context, headers } = authFixture();
  const app = buildApp({ auth: context });
  const handler = jest.fn(async (request: FastifyRequest, reply: FastifyReply) =>
    reply.code(202).send({ message: (request.body as SignupRequest).email }),
  );
  app.addHook('onRoute', (route) => {
    if (route.url === '/api/auth/signup') route.handler = handler;
  });
  try {
    const send = (payload: object) =>
      app.inject({ method: 'POST', url: '/api/auth/signup', headers, payload });
    const valid = await send({ email: ' Person@Example.com ', password, role: 'student' });
    expect(valid.statusCode).toBe(202);
    expect(valid.json()).toEqual({ message: 'person@example.com' });
    handler.mockClear();
    for (const body of [
      { email: 'invalid', password, role: 'student' },
      { email: 'person@example.com', password, role: 'admin' },
      { email: 'person@example.com', password, role: 'student', extra: true },
    ]) {
      const response = await send(body);
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: { code: 'INVALID_REQUEST', message: 'Check the supplied fields and try again.' },
      });
      expect(response.body).not.toContain(password);
    }
    expect(handler).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});

test('auth serialization rejects undeclared response fields without leaking them', async () => {
  const { context, headers } = authFixture();
  const app = buildApp({ auth: context });
  app.addHook('onRoute', (route) => {
    if (route.url === '/api/auth/signup')
      route.handler = async (_request, reply) =>
        reply.code(202).send({ message: 'Accepted', accessToken: 'private-token-value' });
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      headers,
      payload: { email: 'person@example.com', password, role: 'student' },
    });
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe('AUTH_UNAVAILABLE');
    expect(response.body).not.toContain('private-token-value');
  } finally {
    await app.close();
  }
});

test.each([undefined, null, {}])(
  'logout preserves its optional empty-body behavior: %j',
  async (payload) => {
    const { context, headers, service } = authFixture();
    const app = buildApp({ auth: context });
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          ...headers,
          ...(payload === null ? { 'content-type': 'application/json' } : {}),
        },
        ...(payload === null ? { payload: 'null' } : payload === undefined ? {} : { payload }),
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: 'Signed out.' });
      expect(service.logout).not.toHaveBeenCalled();
      expect(response.headers['set-cookie']).toBeDefined();
    } finally {
      await app.close();
    }
  },
);
