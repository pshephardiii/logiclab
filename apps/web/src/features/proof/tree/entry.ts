import type { TreeProof, TreeProofNode } from '@logiclab/contracts';
import { appendTreeNode } from './editor';

export type TreeEntry = { base: TreeProof; draft: TreeProof; index: number };

/** Stage one node, including any entered branch/discharge data, without changing confirmed work. */
export function createTreeEntry(proof: TreeProof, kind: TreeProofNode['kind']): TreeEntry {
  return { base: proof, draft: appendTreeNode(proof, kind), index: proof.nodes.length };
}
