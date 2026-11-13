import type { NaturalDeductionTreeProof } from '../proof/natural-deduction-tree-work.ts';

/** Staged student tree JSON. Statements, private references and checker reports are separate. */
export type NaturalDeductionTreeDerivationAnswer = {
  type: 'derivation';
  proof: NaturalDeductionTreeProof;
};
