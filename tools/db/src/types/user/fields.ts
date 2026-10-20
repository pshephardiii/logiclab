import type { DemoWorkspace } from '../../entities/DemoWorkspace.ts';
import type { UserRole, UserIdentityProvider } from './enums.ts';

/** Readable field reference checked against the decorated User entity. */
export interface UserFields {
  id: string;
  identityProvider: UserIdentityProvider;
  cognitoUserPoolId?: string;
  cognitoSubject?: string;
  demoWorkspace?: DemoWorkspace;
  role: UserRole;
  email?: string;
  createdAt: Date;
}
