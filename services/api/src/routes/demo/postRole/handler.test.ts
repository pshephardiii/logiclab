import { postRoleHandler } from './handler';
import { demoFixture, demoActor, demoId } from '../../../../test/demo-fixture';
import { invokeHandler } from '../../../../test/invoke-handler';

test('postRole delegates demo credentials without changing the normal account cookie', async () => {
  const { runtime, sessions, workspaces } = demoFixture();
  const result = await invokeHandler(
    postRoleHandler(runtime),
    { role: 'student' },
    { logiclab_demo: demoId },
  );
  expect(sessions.switchRole).toHaveBeenCalledWith(demoId, 'student');
  expect(result.setCookies[0]?.name).toBe('logiclab_demo');
});
