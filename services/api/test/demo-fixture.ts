import { readDemoConfig } from '../src/config/demo';
import type { DemoRuntime } from '../src/bootstrap/demo';
import type { DemoActor } from '../src/application/demo/types';
export const demoActor: DemoActor = {
  id: '11111111-1111-4111-8111-111111111111',
  role: 'instructor',
  workspaceId: '22222222-2222-4222-8222-222222222222',
  generation: 1,
};
export const demoId = 'd'.repeat(43);
export function demoFixture() {
  const config = readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: 'http://localhost:5173' })!;
  const sessions = {
    authenticate: jest.fn(async () => demoActor),
    issue: jest.fn(async () => ({ sessionId: demoId, actor: demoActor })),
    switchRole: jest.fn(async () => ({
      sessionId: 'e'.repeat(43),
      actor: { ...demoActor, role: 'student' as const },
    })),
    logout: jest.fn(async () => {}),
    recordActivity: jest.fn(async () => demoActor),
  };
  const workspaces = {
    provision: jest.fn(async () => ({
      workspaceId: demoActor.workspaceId,
      generation: 1,
      templateVersion: 1,
    })),
    reset: jest.fn(async () => ({
      sessionId: 'f'.repeat(43),
      actor: { ...demoActor, generation: 2 },
    })),
  };
  const runtime = {
    config,
    sessions,
    workspaces,
    context: {
      config,
      service: { authenticate: sessions.authenticate },
    } as unknown as DemoRuntime['context'],
    run: async <T>(_id: string, _activity: boolean, work: (actor: DemoActor) => Promise<T>) =>
      work(demoActor),
  } satisfies DemoRuntime;
  return { runtime, sessions, workspaces, config };
}
