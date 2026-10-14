import { postConfirmHandler } from './handler';
import { invokeHandler } from '../../../../test/invoke-handler';
import { authFixture, password, sessionId } from '../../../../test/auth-fixture';

test('valid request invokes confirm and returns a public response', async () => {
  const { context, service } = authFixture();
  const response = await invokeHandler(
    postConfirmHandler(context),
    { email: 'person@example.com', code: '123456' },
    { logiclab_session: sessionId },
  );
  expect(service.confirm).toHaveBeenCalled();
  expect(response.statusCode).toBe(200);
  expect(JSON.stringify(response.body)).not.toContain('private-subject');
  expect(JSON.stringify(response.body)).not.toContain(sessionId);
});

test('invalid fields are rejected before calling confirm', async () => {
  const { context, service } = authFixture();
  await expect(invokeHandler(postConfirmHandler(context), { role: 'admin' })).rejects.toMatchObject(
    { code: 'INVALID_REQUEST' },
  );
  expect(service.confirm).not.toHaveBeenCalled();
});
