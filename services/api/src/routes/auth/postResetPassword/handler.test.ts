import { postResetPasswordHandler } from './handler';
import { invokeHandler } from '../../../../test/invoke-handler';
import { authFixture, password, sessionId } from '../../../../test/auth-fixture';

test('valid request invokes resetPassword and returns a public response', async () => {
  const { context, service } = authFixture();
  const response = await invokeHandler(postResetPasswordHandler(context), { email: 'person@example.com', code: '123456', password }, { logiclab_session: sessionId });
  expect(service.resetPassword).toHaveBeenCalled();
  expect(response.statusCode).toBe(200);
  expect(JSON.stringify(response.body)).not.toContain('private-subject');
  expect(JSON.stringify(response.body)).not.toContain(sessionId);
});

test('invalid fields are rejected before calling resetPassword', async () => {
  const { context, service } = authFixture();
  await expect(invokeHandler(postResetPasswordHandler(context), { role: 'admin' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
  expect(service.resetPassword).not.toHaveBeenCalled();
});
