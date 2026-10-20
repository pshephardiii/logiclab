import { postLogoutHandler } from './handler';
import { demoFixture, demoActor, demoId } from '../../../../test/demo-fixture';
import { invokeHandler } from '../../../../test/invoke-handler';

test('postLogout delegates demo credentials without changing the normal account cookie', async () => {
  const { runtime, sessions, workspaces } = demoFixture();
  const result = await invokeHandler(postLogoutHandler(runtime), {}, { logiclab_demo: demoId });
  expect(sessions.logout).toHaveBeenCalledWith(demoId);
  expect(result.clearedCookies).toEqual(['logiclab_demo']);
});
