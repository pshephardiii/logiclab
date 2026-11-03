import type { ResourceContext } from '../resource-context';
import type { ProblemStore } from '../../persistence/problem/types';

export type ProblemContext = ResourceContext & { problems: ProblemStore };
