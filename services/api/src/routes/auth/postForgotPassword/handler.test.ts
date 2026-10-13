import { postForgotPasswordHandler } from './handler';
import { invokeHandler } from '../../../../test/invoke-handler';
import { authFixture, password, sessionId } from '../../../../test/auth-fixture';

test('valid request invokes forgotPassword and returns a public response', async () => {
  const { context, service } = authFixture();
  const response = await invokeHandler(postForgotPasswordHandler(context), { email: 'person@example.com' }, { logiclab_session: sessionId });
  expect(service.forgotPassword).toHaveBeenCalled();
  expect(response.statusCode).toBe(202);
  expect(JSON.stringify(response.body)).not.toContain('private-subject');
  expect(JSON.stringify(response.body)).not.toContain(sessionId);
});

test('invalid fields are rejected before calling forgotPassword', async () => {
  const { context, service } = authFixture();
  await expect(invokeHandler(postForgotPasswordHandler(context), { role: 'admin' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
  expect(service.forgotPassword).not.toHaveBeenCalled();
});
