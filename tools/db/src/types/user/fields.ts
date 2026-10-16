import type { UserRole } from './enums.js';

/** Readable field reference checked against the decorated User entity. */
export interface UserFields {
  id: string;
  cognitoUserPoolId: string;
  cognitoSubject: string;
  role: UserRole;
  email?: string;
  createdAt: Date;
}
