import type { Role } from '../auth/types';

export type DemoActor = {
  id: string;
  role: Role;
  workspaceId: string;
  generation: number;
};

export interface DemoPolicy {
  idleTimeoutSeconds: number;
  maxLifetimeSeconds: number;
  activityIntervalSeconds: number;
}

/** Internal capability: workspace IDs for issue() must come from trusted provisioning. */
export interface DemoSessionStore {
  issue(workspaceId: string, role: Role, hash: string): Promise<DemoActor | null>;
  resolve(hash: string, recordActivity: boolean): Promise<DemoActor | null>;
  switchRole(hash: string, role: Role, replacementHash: string): Promise<DemoActor | null>;
  revoke(hash: string): Promise<void>;
}
