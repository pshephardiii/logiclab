import { DemoSessionError } from '../../../application/demo/service';
import { postStartHandler } from './handler';
import { demoFixture, demoActor, demoId } from '../../../../test/demo-fixture';
import { invokeHandler } from '../../../../test/invoke-handler';

test('postStart delegates demo credentials without changing the normal account cookie', async () => {
  const { runtime, sessions, workspaces } = demoFixture();
  const result = await invokeHandler(postStartHandler(runtime), { role: 'student' }, {});
  expect(workspaces.provision).toHaveBeenCalledTimes(1);
  expect(sessions.issue).toHaveBeenCalledWith(demoActor.workspaceId, 'student');
  expect(result.setCookies[0]?.name).toBe('logiclab_demo');
});

test('a losing concurrent role rotation does not allocate another workspace', async () => {
  const { runtime, sessions, workspaces } = demoFixture();
  sessions.switchRole.mockRejectedValueOnce(new DemoSessionError());
  await expect(
    invokeHandler(postStartHandler(runtime), { role: 'student' }, { logiclab_demo: demoId }),
  ).rejects.toThrow('DEMO_SESSION_INVALID');
  expect(workspaces.provision).not.toHaveBeenCalled();
});
