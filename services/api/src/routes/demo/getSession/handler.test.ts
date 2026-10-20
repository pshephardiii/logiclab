import { getSessionHandler } from './handler';
import { demoFixture, demoActor, demoId } from '../../../../test/demo-fixture';
import { invokeHandler } from '../../../../test/invoke-handler';

test('getSession delegates demo credentials without changing the normal account cookie', async () => {
  const { runtime, sessions, workspaces } = demoFixture();
  const result = await invokeHandler(getSessionHandler(runtime), {}, { logiclab_demo: demoId });
  expect(sessions.authenticate).toHaveBeenCalledWith(demoId);
  expect(result.body).toMatchObject({ mode: 'demo', user: { id: demoActor.id } });
});
