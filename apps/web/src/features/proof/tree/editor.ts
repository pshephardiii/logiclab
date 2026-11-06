import { PROOF_LIMITS, type TreeProof, type TreeProofNode } from '@logiclab/contracts';

export function uniqueTreeIds(proof: TreeProof): boolean {
  return new Set(proof.nodes.map((node) => node.id)).size === proof.nodes.length;
}

export function newTreeNode(kind: TreeProofNode['kind'], formula = ''): TreeProofNode {
  const id = crypto.randomUUID();
  return kind === 'premise'
    ? { kind, id, formula, premiseId: null }
    : kind === 'assumption'
      ? { kind, id, formula }
      : { kind, id, formula, ruleId: null, lineReferences: [], branches: [] };
}

/** Copy only the target into an unverified root. Later statement edits never rewrite entered work. */
export function startTreeProof(conclusion: string): TreeProof {
  const root = newTreeNode('inference', conclusion);
  return { proofVersion: 1, format: 'tree', rootId: root.id, nodes: [root] };
}

export function appendTreeNode(proof: TreeProof, kind: TreeProofNode['kind']): TreeProof {
  if (!uniqueTreeIds(proof)) throw new Error('Repair duplicate node identities before editing.');
  if (proof.nodes.length >= PROOF_LIMITS.maxSteps)
    throw new Error('The proof node limit has been reached.');
  return { ...proof, nodes: [...proof.nodes, newTreeNode(kind)] };
}

/** Keep incoming citations, discharge selections and root identity unresolved after deletion. */
export function removeTreeNode(proof: TreeProof, id: string): TreeProof {
  return { ...proof, nodes: proof.nodes.filter((node) => node.id !== id) };
}

export function treeNodeChoices(proof: TreeProof) {
  return proof.nodes.map((node, index) => ({
    id: node.id,
    label: `${index + 1}. ${node.formula || '(blank)'} — ${node.kind}`,
  }));
}

/** Presentation walk only: tolerate missing children, bound visits and never recurse into draft data. */
export function treePreviewLayout(
  proof: TreeProof,
): { order: number[]; unattached: number } | null {
  if (!uniqueTreeIds(proof) || proof.nodes.length > PROOF_LIMITS.maxSteps) return null;
  const indices = new Map(proof.nodes.map((node, index) => [node.id, index]));
  const root = proof.rootId === null ? undefined : indices.get(proof.rootId);
  if (root === undefined) return { order: [], unattached: proof.nodes.length };
  const seen = new Set<number>();
  const order: number[] = [];
  // Exit markers build child-first drawing order without following draft links recursively.
  const pending = [{ index: root, exit: false }];
  while (pending.length) {
    const { index, exit } = pending.pop()!;
    if (exit) {
      order.push(index);
      continue;
    }
    // A second visit is a shared child or a cycle: neither is drawn as a valid tree.
    if (seen.has(index)) return null;
    seen.add(index);
    pending.push({ index, exit: true });
    const node = proof.nodes[index]!;
    if (node.kind !== 'inference') continue;
    const children = [
      ...node.lineReferences,
      ...node.branches.flatMap((branch) => (branch.rootId ? [branch.rootId] : [])),
    ];
    for (const id of children.reverse()) {
      const child = indices.get(id);
      // Missing selections are drawn as placeholders; they remain errors for explicit checking.
      if (child !== undefined) pending.push({ index: child, exit: false });
    }
  }
  // Report detached entries rather than hiding them as though the preview covered the whole draft.
  return { order, unattached: proof.nodes.length - seen.size };
}
