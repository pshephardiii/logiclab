import { getSessionHandler } from './handler';
import { invokeHandler } from '../../../../test/invoke-handler';
import { authFixture, password, sessionId } from '../../../../test/auth-fixture';

test('valid request invokes authenticate and returns a public response', async () => {
  const { context, service } = authFixture();
  const response = await invokeHandler(getSessionHandler(context), undefined, {
    logiclab_session: sessionId,
  });
  expect(service.authenticate).toHaveBeenCalled();
  expect(response.statusCode).toBe(200);
  expect(JSON.stringify(response.body)).not.toContain('private-subject');
  expect(JSON.stringify(response.body)).not.toContain(sessionId);
});

test('missing session cookie is rejected before authentication', async () => {
  const { context, service } = authFixture();
  await expect(invokeHandler(getSessionHandler(context), undefined)).rejects.toMatchObject({
    code: 'SESSION_INVALID',
  });
  expect(service.authenticate).not.toHaveBeenCalled();
});
