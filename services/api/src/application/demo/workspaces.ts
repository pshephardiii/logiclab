import { randomBytes, randomUUID } from 'node:crypto';
import { demoSessionHash, DemoSessionError } from './service';
import type { DemoActor } from './types';

export interface DemoWorkspaceSummary {
  workspaceId: string;
  generation: number;
  templateVersion: number;
}
export interface DemoWorkspaceStore {
  provision(workspaceId: string): Promise<DemoWorkspaceSummary>;
  reset(hash: string, replacementHash: string): Promise<DemoActor | null>;
}

/** Internal provisioning/reset entry points; no public routes or admission control yet. */
export function createDemoWorkspaceService(store: DemoWorkspaceStore) {
  return {
    provision: () => store.provision(randomUUID()),
    async reset(id: string) {
      if (!/^[A-Za-z0-9_-]{43}$/.test(id)) throw new DemoSessionError();
      const sessionId = randomBytes(32).toString('base64url');
      const actor = await store.reset(demoSessionHash(id), demoSessionHash(sessionId));
      if (!actor) throw new DemoSessionError();
      return { sessionId, actor };
    },
  };
}
