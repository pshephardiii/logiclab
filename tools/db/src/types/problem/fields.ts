import type { User } from '../../entities/User.js';
import type { ProblemDefinition } from './definition.js';

/** Readable field reference checked against the decorated Problem entity. */
export interface ProblemFields {
  id: string;
  title: string;
  instructions?: string;
  definition: ProblemDefinition;
  owner: User;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
