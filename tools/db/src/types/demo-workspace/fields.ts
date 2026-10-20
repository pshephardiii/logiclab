import type { DemoWorkspaceStatus } from './enums.ts';

/** A visitor's isolated sandbox lifecycle; never an authorization credential by itself. */
export interface DemoWorkspaceFields {
  id: string;
  status: DemoWorkspaceStatus;
  templateVersion: number;
  generation: number;
  createdAt: Date;
  lastActivityAt: Date;
  idleExpiresAt: Date;
  expiresAt: Date;
}
