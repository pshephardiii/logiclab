import type { AuthContext } from '../auth/context';
import type { ProblemStore } from '../../persistence/problem/store';

export type ProblemContext = AuthContext & { problems: ProblemStore };
