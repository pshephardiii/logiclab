import type { User } from '../../entities/User.ts';

/** Readable field reference checked against the decorated Classroom entity. */
export interface ClassroomFields {
  id: string;
  name: string;
  owner: User;
  invitationHash?: string;
  invitationExpiresAt?: Date;
  createdAt: Date;
}
