import { postLoginHandler } from './handler';
import { invokeHandler } from '../../../../test/invoke-handler';
import { authFixture, password, sessionId } from '../../../../test/auth-fixture';

test('valid request invokes login and returns a public response', async () => {
  const { context, service } = authFixture();
  const response = await invokeHandler(postLoginHandler(context), { email: 'person@example.com', password }, { logiclab_session: sessionId });
  expect(service.login).toHaveBeenCalled();
  expect(response.statusCode).toBe(200);
  expect(JSON.stringify(response.body)).not.toContain('private-subject');
  expect(JSON.stringify(response.body)).not.toContain(sessionId);
});

test('invalid fields are rejected before calling login', async () => {
  const { context, service } = authFixture();
  await expect(invokeHandler(postLoginHandler(context), { role: 'admin' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
  expect(service.login).not.toHaveBeenCalled();
});

test('login sets only an opaque cookie and retires an older session', async () => {
  const { context, service } = authFixture();
  const response = await invokeHandler(postLoginHandler(context), { email: 'person@example.com', password }, { logiclab_session: 'old-session' });
  expect(response.setCookies).toEqual([{ name: 'logiclab_session', value: sessionId }]);
  expect(service.logout).toHaveBeenCalledWith('old-session');
});
