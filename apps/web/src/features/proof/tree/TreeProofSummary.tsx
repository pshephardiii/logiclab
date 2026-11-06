import type { TreeProof } from '@logiclab/contracts';
import type { ReactNode } from 'react';

/** Flat diagnostic view tolerates unfinished/cyclic drafts alongside the visual preview. */
export function TreeProofSummary({
  proof,
  rules,
  label,
  children,
}: {
  proof: TreeProof | null;
  rules: { id: string; label: string }[];
  label: string;
  children?: ReactNode;
}) {
  const positions = new Map(proof?.nodes.map((node, index) => [node.id, index + 1]));
  const position = (id: string | null) => (id ? (positions.get(id) ?? '?') : '?');
  const labels = new Map(rules.map((rule) => [rule.id, rule.label]));
  return (
    <details>
      <summary>{label}</summary>
      {!proof ? (
        <p>No proof entered.</p>
      ) : (
        <>
          <p>Conclusion root: node {position(proof.rootId)}.</p>
          {!proof.nodes.length ? (
            <p>No proof nodes entered.</p>
          ) : (
            <ol>
              {proof.nodes.map((node, index) => (
                <li key={index}>
                  <code>{node.formula || '(blank)'}</code> —{' '}
                  {node.kind === 'inference' ? (
                    <>
                      {node.ruleId
                        ? (labels.get(node.ruleId) ?? 'Rule not enabled')
                        : 'No rule selected'}
                      ; supporting nodes {node.lineReferences.map(position).join(', ') || 'none'};
                      discharged branches{' '}
                      {node.branches
                        .map(
                          (branch) =>
                            `node ${position(branch.rootId)} assuming ${branch.assumptionFormula || '(blank)'}; discharge nodes ${branch.assumptionIds.map(position).join(', ') || 'none'}`,
                        )
                        .join(' / ') || 'none'}
                    </>
                  ) : node.kind === 'premise' ? (
                    'Premise'
                  ) : (
                    'Assumption'
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
      {children}
    </details>
  );
}
