import type { TreeProof } from '../proof/tree-work.ts';

/** Staged student tree JSON. Statements, private references and checker reports are separate. */
export type TreeDerivationAnswer = { type: 'derivation'; proof: TreeProof };
