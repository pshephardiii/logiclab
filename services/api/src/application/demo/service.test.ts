import { createDemoSessionService, demoSessionHash } from './service';
import type { DemoSessionStore } from './types';

function fixture() {
  const actor = {
    id: 'instructor',
    role: 'instructor' as const,
    workspaceId: 'workspace',
    generation: 1,
  };
  const store = {
    issue: jest
      .fn<ReturnType<DemoSessionStore['issue']>, Parameters<DemoSessionStore['issue']>>()
      .mockResolvedValue(actor),
    resolve: jest
      .fn<ReturnType<DemoSessionStore['resolve']>, Parameters<DemoSessionStore['resolve']>>()
      .mockResolvedValue(actor),
    switchRole: jest
      .fn<ReturnType<DemoSessionStore['switchRole']>, Parameters<DemoSessionStore['switchRole']>>()
      .mockResolvedValue({ ...actor, id: 'student', role: 'student' }),
    revoke: jest
      .fn<ReturnType<DemoSessionStore['revoke']>, Parameters<DemoSessionStore['revoke']>>()
      .mockResolvedValue(undefined),
  };
  return { store, service: createDemoSessionService(store) };
}

test('demo service passes only a domain-separated hash to persistence', async () => {
  const { service, store } = fixture();
  const issued = await service.issue('workspace', 'instructor');
  expect(issued.sessionId).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(store.issue).toHaveBeenCalledWith(
    'workspace',
    'instructor',
    demoSessionHash(issued.sessionId),
  );
  expect(demoSessionHash(issued.sessionId)).not.toContain(issued.sessionId);
  await service.authenticate(issued.sessionId);
  expect(store.resolve).toHaveBeenLastCalledWith(demoSessionHash(issued.sessionId), false);
  await service.recordActivity(issued.sessionId);
  expect(store.resolve).toHaveBeenLastCalledWith(demoSessionHash(issued.sessionId), true);
  const switched = await service.switchRole(issued.sessionId, 'student');
  expect(switched.sessionId).not.toEqual(issued.sessionId);
  expect(store.switchRole).toHaveBeenCalledWith(
    demoSessionHash(issued.sessionId),
    'student',
    demoSessionHash(switched.sessionId),
  );
  await service.logout(switched.sessionId);
  expect(store.revoke).toHaveBeenCalledWith(demoSessionHash(switched.sessionId));
});

test('malformed or missing demo credentials fail without creating a normal session', async () => {
  const { service, store } = fixture();
  await expect(service.authenticate('workspace-id')).rejects.toThrow('DEMO_SESSION_INVALID');
  expect(store.resolve).not.toHaveBeenCalled();
  store.resolve.mockResolvedValue(null);
  await expect(service.authenticate('x'.repeat(43))).rejects.toThrow('DEMO_SESSION_INVALID');
  store.issue.mockResolvedValue(null);
  await expect(service.issue('expired-workspace', 'student')).rejects.toThrow(
    'DEMO_SESSION_INVALID',
  );
  store.switchRole.mockResolvedValue(null);
  await expect(service.switchRole('x'.repeat(43), 'student')).rejects.toThrow(
    'DEMO_SESSION_INVALID',
  );
});
