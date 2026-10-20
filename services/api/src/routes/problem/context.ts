import type { ResourceContext } from '../resource-context';
import type { ProblemStore } from '../../persistence/problem/store';

export type ProblemContext = ResourceContext & { problems: ProblemStore };
