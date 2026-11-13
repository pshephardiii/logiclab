import type { NaturalDeductionTreeProof } from '@logiclab/contracts';
import { proofNotation } from '../helpers/proof-notation';

/** Retained nodes keep their original numbers, including detached or malformed references. */
export function NaturalDeductionTreeProofNodeList({
  proof,
  rules,
  indices = proof.nodes.map((_, index) => index),
}: {
  proof: NaturalDeductionTreeProof;
  rules: { id: string; label: string }[];
  indices?: number[];
}) {
  const positions = new Map(proof.nodes.map((node, index) => [node.id, index + 1]));
  const position = (id: string | null) => (id ? (positions.get(id) ?? '?') : '?');
  const labels = new Map(rules.map((rule) => [rule.id, rule.label]));

  return (
    <ol className="natural-deduction-tree-node-list">
      {indices.map((index) => {
        const node = proof.nodes[index]!;

        return (
          <li key={index} value={index + 1}>
            <code>{proofNotation(node.formula) || '(blank)'}</code> —{' '}
            {node.kind === 'inference' ? (
              <>
                {node.ruleId ? (labels.get(node.ruleId) ?? 'Rule not enabled') : 'No rule selected'}
                ; supporting nodes {node.lineReferences.map(position).join(', ') || 'none'};
                discharged branches{' '}
                {node.branches
                  .map(
                    (branch) =>
                      `node ${position(branch.rootId)} assuming ${proofNotation(branch.assumptionFormula) || '(blank)'}; discharge nodes ${branch.assumptionIds.map(position).join(', ') || 'none'}`,
                  )
                  .join(' / ') || 'none'}
              </>
            ) : node.kind === 'premise' ? (
              'Premise'
            ) : (
              'Assumption'
            )}
          </li>
        );
      })}
    </ol>
  );
}
