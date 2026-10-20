import { postResetHandler } from './handler';
import { demoFixture, demoActor, demoId } from '../../../../test/demo-fixture';
import { invokeHandler } from '../../../../test/invoke-handler';

test('postReset delegates demo credentials without changing the normal account cookie', async () => {
  const { runtime, sessions, workspaces } = demoFixture();
  const result = await invokeHandler(postResetHandler(runtime), {}, { logiclab_demo: demoId });
  expect(workspaces.reset).toHaveBeenCalledWith(demoId);
  expect(result.body).toMatchObject({ workspace: { generation: 2 } });
});
