import { buildApp } from '../../../app';
import { authFixture, password, sessionId } from '../../../../test/auth-fixture';

test('registers POST /api/auth/confirm', async () => {
  const { context, headers } = authFixture();
  const app = buildApp({ auth: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/confirm',
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
      payload: { email: 'person@example.com', code: '123456' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
  } finally {
    await app.close();
  }
});

test('rejects cross-origin requests before provider calls', async () => {
  const { context, service } = authFixture();
  const app = buildApp({ auth: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/confirm',
      headers: { origin: 'https://attacker.example' },
      payload: { email: 'person@example.com', code: '123456' },
    });
    expect(response.statusCode).toBe(403);
    expect(service.confirm).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});

test.each([
  ['CodeMismatchException', 'The confirmation code is invalid.', 'code_mismatch'],
  ['ExpiredCodeException', 'The confirmation code has expired.', 'code_expired'],
  ['InvalidParameterException', 'Could not confirm this email.', 'invalid_parameter'],
])('explains %s without exposing upstream details', async (name, message, reason) => {
  const { context, service, headers } = authFixture();
  service.confirm.mockRejectedValueOnce(
    Object.assign(new Error('private email and confirmation code'), { name }),
  );
  const app = buildApp({ auth: context });
  const info = jest.fn();
  app.addHook('onRequest', (request, _reply, done) => {
    request.log = Object.assign(Object.create(request.log), { info });
    done();
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/confirm',
      headers,
      payload: { email: 'person@example.com', code: '123456' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('CONFIRMATION_FAILED');
    expect(response.json().error.message).toContain(message);
    expect(response.body).not.toContain('private');
    expect(response.body).not.toContain('password');
    expect(info).toHaveBeenCalledWith(
      { code: 'CONFIRMATION_FAILED', reason },
      'Email confirmation rejected',
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain('123456');
    expect(JSON.stringify(info.mock.calls)).not.toContain('person@example.com');
  } finally {
    await app.close();
  }
});
