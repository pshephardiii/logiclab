import type { TreeProof, TreeProofNode } from '@logiclab/contracts';
import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';
import { createTreeEntry, type TreeEntry, type TreeConnection } from './entry';

/** Offer vacant slots only, without treating the parent's rule application as valid. */
export function treeConnectionSlots(proof: TreeProof, parentId: string, rules: { id: string }[]) {
  const parent = proof.nodes.find((node) => node.id === parentId);
  const rule =
    parent?.kind === 'inference' && parent.ruleId && rules.some((rule) => rule.id === parent.ruleId)
      ? getPropositionalRule(parent.ruleId)
      : undefined;

  if (!rule || parent?.kind !== 'inference') return { support: -1, branch: -1 };

  return {
    support:
      Array.from({ length: rule.lineReferences }, (_, index) => index).find(
        (index) => !parent.lineReferences[index],
      ) ?? -1,
    branch:
      Array.from({ length: rule.subproofReferences }, (_, index) => index).find((index) => {
        const branch = parent.branches[index];
        return (
          !branch || (!branch.rootId && !branch.assumptionFormula && !branch.assumptionIds.length)
        );
      }) ?? -1,
  };
}

export function createConnectedTreeEntry(
  proof: TreeProof,
  parentId: string,
  kind: TreeProofNode['kind'],
  connection: TreeConnection['kind'],
  rules: { id: string }[],
): TreeEntry {
  const slot = treeConnectionSlots(proof, parentId, rules)[connection];
  if (slot < 0) throw new Error('Choose an enabled rule with an available connection slot.');

  return {
    ...createTreeEntry(proof, kind),
    connection: { parentId, kind: connection, slot, assumptionFormula: '', assumptionIds: [] },
  };
}

/** Attach on explicit confirmation only. Existing references and the conclusion root are retained. */
export function confirmTreeEntry(entry: TreeEntry): TreeProof {
  if (!entry.connection) return entry.draft;

  const connection = entry.connection;
  const child = entry.draft.nodes[entry.index]!;
  const parent = entry.draft.nodes.find((node) => node.id === connection.parentId);
  if (parent?.kind !== 'inference')
    throw new Error('The target inference is unavailable. Discard entry and try again.');

  const next = {
    ...parent,
    lineReferences: [...parent.lineReferences],
    branches: [...parent.branches],
  };
  if (connection.kind === 'support') {
    if (next.lineReferences[connection.slot])
      throw new Error('This support slot is already filled.');
    next.lineReferences[connection.slot] = child.id;
  } else {
    const branch = next.branches[connection.slot];
    if (branch && (branch.rootId || branch.assumptionFormula || branch.assumptionIds.length))
      throw new Error('This branch already contains work.');
    while (next.branches.length <= connection.slot)
      next.branches.push({ rootId: null, assumptionFormula: '', assumptionIds: [] });
    next.branches[connection.slot] = {
      rootId: child.id,
      assumptionFormula: connection.assumptionFormula,
      assumptionIds: [...connection.assumptionIds],
    };
  }

  return {
    ...entry.draft,
    nodes: entry.draft.nodes.map((node) => (node.id === next.id ? next : node)),
  };
}
