import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';
import { createDemoAccess } from '../persistence/demo/access';
import { createDemoSessionStore } from '../persistence/demo/sessions';
import { createDemoWorkspaceStore } from '../persistence/demo/workspaces';
import {
  createDemoSessionService,
  demoSessionHash,
  DemoSessionError,
} from '../application/demo/service';
import { createDemoWorkspaceService } from '../application/demo/workspaces';
import { demoActivityUpdate } from '../application/demo/policy';
import { AuthError } from '../application/auth/service';
import type { DemoActor } from '../application/demo/types';
import { createClassroomStore } from '../persistence/classroom/store';
import { createProblemStore } from '../persistence/problem/store';
import { createAssignmentStore } from '../persistence/assignment/store';
import { createStudentWorkStore } from '../persistence/student-work/store';
import { createBillingStore } from '../persistence/billing/store';
import { createBillingService } from '../application/billing/service';
import { createSimulatorProvider } from '../integrations/payments/simulator/provider';
import { readDemoConfig, type DemoConfig } from '../config/demo';
import type { Database } from '../persistence/transactions';

type Stores = {
  classrooms: Awaited<ReturnType<typeof createClassroomStore>>;
  problems: Awaited<ReturnType<typeof createProblemStore>>;
  assignments: Awaited<ReturnType<typeof createAssignmentStore>>;
  studentWork: Awaited<ReturnType<typeof createStudentWorkStore>>;
  billing: ReturnType<typeof createBillingService>;
};

/** Request-local store bindings keep demo handlers on one workspace-locked transaction. */
export async function createDemoRuntime(orm: Database, config: DemoConfig) {
  const sessions = createDemoSessionService(await createDemoSessionStore(orm, config));
  const workspaces = createDemoWorkspaceService(
    await createDemoWorkspaceStore(orm, config, config.capacity),
  );
  const access = await createDemoAccess(orm);
  const scope = new AsyncLocalStorage<{ actor: DemoActor; stores: Stores }>();
  const simulator = { signingSecret: randomBytes(32).toString('hex') };
  function scopedStore<K extends keyof Stores>(name: K): Stores[K] {
    return new Proxy({} as Stores[K], {
      get(_target, method: string) {
        return (...args: unknown[]) => {
          const current = scope.getStore();
          if (!current) throw new Error('Demo resource transaction is required.');
          if (!(name === 'billing' && method === 'plans') && args[0] !== current.actor.id)
            throw new AuthError('SESSION_INVALID');
          const store = current.stores[name];
          const operation: unknown = Reflect.get(store, method);
          if (typeof operation !== 'function') throw new Error('Unknown demo operation.');
          return Reflect.apply(operation, store, args);
        };
      },
    });
  }
  const context = {
    config,
    service: {
      authenticate: async (id: string) => {
        try {
          return await sessions.authenticate(id);
        } catch (error) {
          if (error instanceof DemoSessionError) throw new AuthError('SESSION_INVALID');
          throw error;
        }
      },
    },
    classrooms: scopedStore('classrooms'),
    problems: scopedStore('problems'),
    assignments: scopedStore('assignments'),
    studentWork: scopedStore('studentWork'),
    billing: scopedStore('billing'),
  };
  async function run<T>(
    id: string,
    activity: boolean,
    work: (actor: DemoActor) => Promise<T>,
  ): Promise<T> {
    const result = await access.withSession(
      demoSessionHash(id),
      async (em, workspace, session, now) => {
        const actor = await access.actorFor(
          em,
          workspace.id,
          session.generation,
          session.selectedRole,
        );
        if (!actor) throw new AuthError('SESSION_INVALID');
        const stores: Stores = {
          classrooms: await createClassroomStore(orm, em),
          problems: await createProblemStore(orm, em),
          assignments: await createAssignmentStore(orm, em),
          studentWork: await createStudentWorkStore(orm, em),
          billing: createBillingService(
            await createBillingStore(orm, em),
            createSimulatorProvider(simulator),
            simulator,
          ),
        };
        const payload = await scope.run({ actor, stores }, () => work(actor));
        if (activity) {
          const update = demoActivityUpdate(workspace, now, config);
          if (update) Object.assign(workspace, update);
        }
        await em.flush();
        return { payload };
      },
    );
    if (!result) throw new AuthError('SESSION_INVALID');
    return result.payload;
  }
  return { config, sessions, workspaces, context, run };
}
export type DemoRuntime = Awaited<ReturnType<typeof createDemoRuntime>>;

export async function createDemoDependencies(env: NodeJS.ProcessEnv) {
  const config = readDemoConfig(env);
  if (!config) return null;
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required for demo mode.');
  const { createDatabase } = await import('@logiclab/db');
  const orm = await createDatabase(env.DATABASE_URL);
  try {
    return { runtime: await createDemoRuntime(orm, config), close: () => orm.close(true) };
  } catch (error) {
    await orm.close(true);
    throw error;
  }
}
