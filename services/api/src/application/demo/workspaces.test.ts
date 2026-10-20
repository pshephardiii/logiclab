import { createDemoWorkspaceService, type DemoWorkspaceStore } from './workspaces';
import { demoSessionHash } from './service';

function fixture() {
  const actor = {
    id: 'student',
    role: 'student' as const,
    workspaceId: 'workspace',
    generation: 2,
  };
  const store = {
    provision: jest
      .fn<
        ReturnType<DemoWorkspaceStore['provision']>,
        Parameters<DemoWorkspaceStore['provision']>
      >()
      .mockResolvedValue({ workspaceId: 'workspace', generation: 1, templateVersion: 1 }),
    reset: jest
      .fn<ReturnType<DemoWorkspaceStore['reset']>, Parameters<DemoWorkspaceStore['reset']>>()
      .mockResolvedValue(actor),
  };
  return { store, service: createDemoWorkspaceService(store) };
}

test('provisioning uses a server-generated identity and reset returns only a fresh opaque credential', async () => {
  const { service, store } = fixture();
  await service.provision();
  expect(store.provision.mock.calls[0]![0]).toMatch(/^[0-9a-f-]{36}$/);
  const old = 'x'.repeat(43);
  const reset = await service.reset(old);
  expect(reset.sessionId).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(reset.sessionId).not.toBe(old);
  expect(store.reset).toHaveBeenCalledWith(demoSessionHash(old), demoSessionHash(reset.sessionId));
  expect(reset.actor.generation).toBe(2);
});

test('invalid and expired reset credentials cannot request a replacement workspace', async () => {
  const { service, store } = fixture();
  await expect(service.reset('workspace-id')).rejects.toThrow('DEMO_SESSION_INVALID');
  expect(store.reset).not.toHaveBeenCalled();
  store.reset.mockResolvedValue(null);
  await expect(service.reset('x'.repeat(43))).rejects.toThrow('DEMO_SESSION_INVALID');
  expect(store.provision).not.toHaveBeenCalled();
});
