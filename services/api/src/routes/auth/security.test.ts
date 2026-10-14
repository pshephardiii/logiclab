import { buildApp } from '../../app';
import { authFixture, password } from '../../../test/auth-fixture';

test('auth endpoints are absent when authentication is disabled', async () => {
  const app = buildApp();
  try {
    expect((await app.inject({ method: 'GET', url: '/api/auth/session' })).statusCode).toBe(404);
  } finally {
    await app.close();
  }
});

test('login rate limits reject further attempts before calling Cognito and ignore spoofed forwarding headers', async () => {
  const { context, service, headers } = authFixture();
  const app = buildApp({ auth: context });
  try {
    for (let i = 0; i < 10; i++) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: { ...headers, 'x-forwarded-for': `10.0.0.${i}` },
        payload: { email: 'person@example.com', password },
      });
      expect(response.statusCode).toBe(200);
    }
    const limited = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers,
      payload: { email: 'person@example.com', password },
    });
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error.code).toBe('RATE_LIMITED');
    expect(service.login).toHaveBeenCalledTimes(10);
  } finally {
    await app.close();
  }
});

test.each(['forgot-password', 'resend'])(
  '%s returns identical account-neutral responses for missing and available accounts',
  async (path) => {
    const { context, service, headers } = authFixture();
    const app = buildApp({ auth: context });
    const providerMethod = path === 'resend' ? service.resend : service.forgotPassword;
    try {
      const send = () =>
        app.inject({
          method: 'POST',
          url: `/api/auth/${path}`,
          headers,
          payload: { email: 'person@example.com' },
        });
      const available = await send();
      providerMethod.mockRejectedValue(
        Object.assign(new Error('contains private account info'), {
          name: 'UserNotFoundException',
        }),
      );
      const missing = await send();
      expect(missing.statusCode).toBe(202);
      expect(missing.json()).toEqual(available.json());
    } finally {
      await app.close();
    }
  },
);

test('reset failures do not distinguish a nonexistent user from an incorrect code', async () => {
  const { context, service, headers } = authFixture();
  const app = buildApp({ auth: context });
  try {
    const send = () =>
      app.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        headers,
        payload: { email: 'person@example.com', code: '123456', password },
      });
    service.resetPassword.mockRejectedValueOnce(
      Object.assign(new Error('private'), { name: 'CodeMismatchException' }),
    );
    const badCode = await send();
    service.resetPassword.mockRejectedValueOnce(
      Object.assign(new Error('private'), { name: 'UserNotFoundException' }),
    );
    const missing = await send();
    expect(missing.statusCode).toBe(badCode.statusCode);
    expect(missing.json()).toEqual(badCode.json());
  } finally {
    await app.close();
  }
});

test('invalid signup role cannot reach provisioning and email is normalized', async () => {
  const { context, service, headers } = authFixture();
  const app = buildApp({ auth: context });
  try {
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/auth/signup',
          headers,
          payload: { email: 'person@example.com', password, role: 'admin' },
        })
      ).statusCode,
    ).toBe(400);
    expect(service.signup).not.toHaveBeenCalled();
    await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      headers,
      payload: { email: ' Person@Example.com ', password, role: 'student' },
    });
    expect(service.signup).toHaveBeenCalledWith('person@example.com', password, 'student');
  } finally {
    await app.close();
  }
});

test('unexpected provider failures return no credential or SDK error detail', async () => {
  const { context, service, headers } = authFixture();
  const app = buildApp({ auth: context });
  service.login.mockRejectedValue(new Error('private-token password secret'));
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers,
      payload: { email: 'person@example.com', password },
    });
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('private-token');
  } finally {
    await app.close();
  }
});

test('missing origin and malformed JSON fail before provider calls', async () => {
  const { context, service, headers } = authFixture();
  const app = buildApp({ auth: context });
  try {
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: { email: 'person@example.com', password },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          headers: { ...headers, 'content-type': 'application/json' },
          payload: '{',
        })
      ).statusCode,
    ).toBe(400);
    expect(service.login).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});
