import type { ProofCheckReport } from '@logiclab/contracts';

export type DerivationReferenceCheck =
  { status: 'missing' } | { status: 'checked'; report: ProofCheckReport };
