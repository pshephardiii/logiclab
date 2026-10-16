import type { Problem } from '../../entities/Problem.js';
import type { ProblemDefinition } from '../problem/definition.js';

/** Readable field reference checked against the decorated ProblemVersion entity. */
export interface ProblemVersionFields {
  id: string;
  title: string;
  instructions?: string;
  definition: ProblemDefinition;
  problem: Problem;
  version: number;
  publishedAt: Date;
}
