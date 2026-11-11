import type { TreeProof, TreeProofNode } from '@logiclab/contracts';
import { appendTreeNode } from './editor';

export type TreeConnection = {
  parentId: string;
  kind: 'support' | 'branch';
  slot: number;
  assumptionFormula: string;
  assumptionIds: string[];
};

export type TreeEntry = {
  base: TreeProof;
  draft: TreeProof;
  index: number;
  connection?: TreeConnection;
};

/** Stage one node, including any entered branch/discharge data, without changing confirmed work. */
export function createTreeEntry(proof: TreeProof, kind: TreeProofNode['kind']): TreeEntry {
  return { base: proof, draft: appendTreeNode(proof, kind), index: proof.nodes.length };
}
