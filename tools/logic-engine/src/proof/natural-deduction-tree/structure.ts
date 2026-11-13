import {
  PROOF_LIMITS,
  type NaturalDeductionTreeProof,
  type ProofDiagnostic,
} from '@logiclab/contracts';
import { structureDiagnostics } from '../structure-diagnostics';
import { proofBudget, ProofBudgetExceeded, type ProofBudget } from '../proof-budget';

export type NaturalDeductionTreeReferences = {
  lineIndices: number[];
  branches: { rootIndex: number; assumptionIndices: number[] }[];
};

export type NaturalDeductionTreeStructureResult =
  | { status: 'invalid' | 'incomplete' | 'unassessable'; diagnostics: ProofDiagnostic[] }
  | {
      status: 'resolved';
      diagnostics: ProofDiagnostic[];
      rootIndex: number;
      postorder: number[];
      references: NaturalDeductionTreeReferences[];
    };

/** Transport-validated nodes only. Resolve a strict tree iteratively, independent of array order. */
export function analyzeNaturalDeductionTreeStructure(
  proof: NaturalDeductionTreeProof,
  budget: ProofBudget = proofBudget(),
): NaturalDeductionTreeStructureResult {
  const diagnostics = structureDiagnostics();
  let incomplete = false;

  const fail = (message: string, stepIndex?: number) =>
    diagnostics.add({
      code: 'INVALID_STRUCTURE',
      message,
      ...(stepIndex === undefined ? {} : { stepIndex }),
    });

  try {
    // Direct typed callers still need version/size guards before the graph walk begins.
    if (proof.proofVersion !== 1 || proof.format !== 'tree')
      return {
        status: 'unassessable',
        diagnostics: [
          { code: 'UNSUPPORTED_VERSION', message: 'Unsupported tree proof format or version.' },
        ],
      };

    if (
      proof.nodes.length > PROOF_LIMITS.maxSteps ||
      proof.nodes.some(
        (node) =>
          node.kind === 'inference' &&
          (node.lineReferences.length > 2 ||
            node.branches.length > 2 ||
            node.branches.some((branch) => branch.assumptionIds.length > PROOF_LIMITS.maxSteps)),
      )
    )
      return {
        status: 'unassessable',
        diagnostics: [
          { code: 'RESOURCE_LIMIT', message: 'Natural-deduction tree proof list limit exceeded.' },
        ],
      };

    // Resolve stable IDs once. Duplicate IDs would make every later citation ambiguous.
    const indices = new Map<string, number>();

    for (const [index, node] of proof.nodes.entries()) {
      budget.spend(1);

      if (indices.has(node.id)) fail('Natural-deduction tree node IDs must be unique.', index);

      indices.set(node.id, index);
    }

    if (diagnostics.items.length) return { status: 'invalid', diagnostics: diagnostics.result() };

    // Both ordinary supports and discharged branches are child edges in the same strict tree.
    const references: NaturalDeductionTreeReferences[] = [];
    const parents = proof.nodes.map(() => 0);

    for (const [index, node] of proof.nodes.entries()) {
      const reference: NaturalDeductionTreeReferences = { lineIndices: [], branches: [] };

      const childIndex = (id: string): number | undefined => {
        budget.spend(1);

        const child = indices.get(id);

        if (child === undefined)
          fail('Supporting child must identify a submitted tree node.', index);
        else {
          parents[child] = parents[child]! + 1;

          if (parents[child]! > 1)
            fail('A supporting node cannot be shared; create a separate occurrence.', index);
        }

        return child;
      };

      if (node.kind === 'inference') {
        for (const id of node.lineReferences) {
          const child = childIndex(id);

          if (child !== undefined) reference.lineIndices.push(child);
        }

        for (const branch of node.branches) {
          // Check identity/kind here; whether these leaves are still open belongs to evaluation.
          const selected = new Set<string>();
          const assumptionIndices: number[] = [];

          for (const id of branch.assumptionIds) {
            budget.spend(1);

            const assumption = indices.get(id);

            if (
              selected.has(id) ||
              assumption === undefined ||
              proof.nodes[assumption]!.kind !== 'assumption'
            )
              fail('Discharge must name distinct assumption-leaf occurrences.', index);
            else assumptionIndices.push(assumption);

            selected.add(id);
          }

          if (branch.rootId === null) {
            incomplete = true;
            diagnostics.add({
              code: 'INCOMPLETE_PROOF',
              message: 'Discharged branch needs a supporting subtree.',
              stepIndex: index,
            });
          } else {
            const rootIndex = childIndex(branch.rootId);

            if (rootIndex !== undefined) reference.branches.push({ rootIndex, assumptionIndices });
          }
        }
      }

      references.push(reference);
    }

    // A missing selection is unfinished work; a selected nonexistent or parented root is invalid.
    const rootIndex = proof.rootId === null ? undefined : indices.get(proof.rootId);

    if (proof.rootId === null) {
      incomplete = true;
      diagnostics.add({ code: 'INCOMPLETE_PROOF', message: 'Select a proof root.' });
    } else if (rootIndex === undefined) fail('The proof root must identify a submitted node.');

    if (rootIndex !== undefined && parents[rootIndex] !== 0)
      fail('The proof root cannot be another node’s supporting child.', rootIndex);

    const postorder: number[] = [];

    // 0 = unseen, 1 = on the active path, 2 = finished. Revisiting 1 exposes a cycle.
    const state = proof.nodes.map(() => 0);

    if (rootIndex !== undefined) {
      const pending: { index: number; exit: boolean }[] = [{ index: rootIndex, exit: false }];

      while (pending.length) {
        budget.spend(1);

        const { index, exit } = pending.pop()!;

        if (exit) {
          // Exit markers run after children, producing the evaluation order without recursion.
          state[index] = 2;
          postorder.push(index);
          continue;
        }

        if (state[index] === 1) {
          fail('Natural-deduction tree child references must not form a cycle.', index);
          continue;
        }

        if (state[index] === 2) continue;

        state[index] = 1;

        pending.push({ index, exit: true });

        const reference = references[index]!;

        const children = [
          ...reference.lineIndices,
          ...reference.branches.map((branch) => branch.rootIndex),
        ];

        for (const child of children.reverse()) pending.push({ index: child, exit: false });
      }

      // Detached work cannot be hidden from verification by choosing a different root.
      for (const [index, visited] of state.entries())
        if (!visited) fail('Every submitted node must belong to the selected root’s tree.', index);
    }

    // Expose resolved indices only after the whole structure is safe; never certify a partial walk.
    if (diagnostics.limited) return { status: 'unassessable', diagnostics: diagnostics.result() };

    if (diagnostics.items.some((item) => item.code !== 'INCOMPLETE_PROOF'))
      return { status: 'invalid', diagnostics: diagnostics.result() };

    if (incomplete || rootIndex === undefined)
      return { status: 'incomplete', diagnostics: diagnostics.result() };

    return { status: 'resolved', diagnostics: [], rootIndex, postorder, references };
  } catch (error) {
    if (!(error instanceof ProofBudgetExceeded)) throw error;

    diagnostics.add({ code: 'RESOURCE_LIMIT', message: error.message });
    return { status: 'unassessable', diagnostics: diagnostics.result() };
  }
}
