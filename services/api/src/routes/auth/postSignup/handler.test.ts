import { postSignupHandler } from './handler';
import { invokeHandler } from '../../../../test/invoke-handler';
import { authFixture, password, sessionId } from '../../../../test/auth-fixture';

test('valid request invokes signup and returns a public response', async () => {
  const { context, service } = authFixture();
  const response = await invokeHandler(postSignupHandler(context), { email: 'Person@Example.com', password, role: 'student' }, { logiclab_session: sessionId });
  expect(service.signup).toHaveBeenCalled();
  expect(response.statusCode).toBe(202);
  expect(JSON.stringify(response.body)).not.toContain('private-subject');
  expect(JSON.stringify(response.body)).not.toContain(sessionId);
});

test('invalid fields are rejected before calling signup', async () => {
  const { context, service } = authFixture();
  await expect(invokeHandler(postSignupHandler(context), { role: 'admin' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
  expect(service.signup).not.toHaveBeenCalled();
});
