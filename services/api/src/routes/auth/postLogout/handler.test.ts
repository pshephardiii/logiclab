import { postLogoutHandler } from './handler';
import { invokeHandler } from '../../../../test/invoke-handler';
import { authFixture, password, sessionId } from '../../../../test/auth-fixture';

test('valid request invokes logout and returns a public response', async () => {
  const { context, service } = authFixture();
  const response = await invokeHandler(
    postLogoutHandler(context),
    {},
    { logiclab_session: sessionId },
  );
  expect(service.logout).toHaveBeenCalled();
  expect(response.statusCode).toBe(200);
  expect(JSON.stringify(response.body)).not.toContain('private-subject');
  expect(JSON.stringify(response.body)).not.toContain(sessionId);
});

test('invalid fields are rejected before calling logout', async () => {
  const { context, service } = authFixture();
  await expect(invokeHandler(postLogoutHandler(context), { role: 'admin' })).rejects.toMatchObject({
    code: 'INVALID_REQUEST',
  });
  expect(service.logout).not.toHaveBeenCalled();
});

test('cookie clears even when provider revocation fails', async () => {
  const { context, service } = authFixture();
  service.logout.mockRejectedValue(new Error('AWS failed'));
  // Observe finally through a reply spy while letting the rejection propagate.
  const clearCookie = jest.fn();
  await expect(
    postLogoutHandler(context)(
      { body: {}, cookies: { logiclab_session: sessionId } } as never,
      { clearCookie } as never,
    ),
  ).rejects.toThrow();
  expect(clearCookie).toHaveBeenCalled();
});
