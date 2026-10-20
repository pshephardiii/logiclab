import { createHash, randomBytes } from 'node:crypto';
import type { Role } from '../auth/types';
import type { DemoSessionStore } from './types';

export class DemoSessionError extends Error {
  constructor() {
    super('DEMO_SESSION_INVALID');
    this.name = 'DemoSessionError';
  }
}

// Separate namespace from normal session hashes, even if a cookie is sent to the wrong path.
export const demoSessionHash = (id: string) =>
  createHash('sha256').update(`demo:${id}`).digest('hex');
const newId = () => randomBytes(32).toString('base64url');
const validId = (id: string) => /^[A-Za-z0-9_-]{43}$/.test(id);
const validRole = (role: Role) => role === 'student' || role === 'instructor';

/** Issues and rotates internal demo credentials; no Cognito/provider calls or HTTP wiring. */
export function createDemoSessionService(store: DemoSessionStore) {
  return {
    async issue(workspaceId: string, role: Role) {
      if (!validRole(role)) throw new DemoSessionError();
      const sessionId = newId();
      const actor = await store.issue(workspaceId, role, demoSessionHash(sessionId));
      if (!actor) throw new DemoSessionError();
      return { sessionId, actor };
    },
    async authenticate(id: string) {
      if (!validId(id)) throw new DemoSessionError();
      const actor = await store.resolve(demoSessionHash(id), false);
      if (!actor) throw new DemoSessionError();
      return actor;
    },
    async recordActivity(id: string) {
      if (!validId(id)) throw new DemoSessionError();
      const actor = await store.resolve(demoSessionHash(id), true);
      if (!actor) throw new DemoSessionError();
      return actor;
    },
    async switchRole(id: string, role: Role) {
      if (!validId(id) || !validRole(role)) throw new DemoSessionError();
      const sessionId = newId();
      const actor = await store.switchRole(demoSessionHash(id), role, demoSessionHash(sessionId));
      if (!actor) throw new DemoSessionError();
      return { sessionId, actor };
    },
    async logout(id: string) {
      if (validId(id)) await store.revoke(demoSessionHash(id));
    },
  };
}
