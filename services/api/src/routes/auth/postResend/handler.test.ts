import { postResendHandler } from './handler';
import { invokeHandler } from '../../../../test/invoke-handler';
import { authFixture, password, sessionId } from '../../../../test/auth-fixture';

test('valid request invokes resend and returns a public response', async () => {
  const { context, service } = authFixture();
  const response = await invokeHandler(
    postResendHandler(context),
    { email: 'person@example.com' },
    { logiclab_session: sessionId },
  );
  expect(service.resend).toHaveBeenCalled();
  expect(response.statusCode).toBe(202);
  expect(JSON.stringify(response.body)).not.toContain('private-subject');
  expect(JSON.stringify(response.body)).not.toContain(sessionId);
});

test('invalid fields are rejected before calling resend', async () => {
  const { context, service } = authFixture();
  await expect(invokeHandler(postResendHandler(context), { role: 'admin' })).rejects.toMatchObject({
    code: 'INVALID_REQUEST',
  });
  expect(service.resend).not.toHaveBeenCalled();
});
