import type { NaturalDeductionTreeProof, NaturalDeductionTreeProofNode } from '@logiclab/contracts';
import { appendNaturalDeductionTreeNode } from './editor';

export type NaturalDeductionTreeConnection = {
  parentId: string;
  kind: 'support' | 'branch';
  slot: number;
  assumptionFormula: string;
  assumptionIds: string[];
};

export type NaturalDeductionTreeEntry = {
  base: NaturalDeductionTreeProof;
  draft: NaturalDeductionTreeProof;
  index: number;
  connection?: NaturalDeductionTreeConnection;
};

/** Stage one node, including any entered branch/discharge data, without changing confirmed work. */
export function createNaturalDeductionTreeEntry(
  proof: NaturalDeductionTreeProof,
  kind: NaturalDeductionTreeProofNode['kind'],
): NaturalDeductionTreeEntry {
  return {
    base: proof,
    draft: appendNaturalDeductionTreeNode(proof, kind),
    index: proof.nodes.length,
  };
}
