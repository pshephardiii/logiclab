import type { DemoWorkspace } from '../../entities/DemoWorkspace.ts';
import type { UserRole } from '../user/enums.ts';

export interface DemoSessionFields {
  id: string;
  workspace: DemoWorkspace;
  generation: number;
  selectedRole: UserRole;
  createdAt: Date;
}
