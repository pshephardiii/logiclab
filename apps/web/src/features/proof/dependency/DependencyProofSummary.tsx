import type { DependencyProof } from '@logiclab/contracts';
import type { ReactNode } from 'react';

export function DependencyProofSummary({
  proof,
  rules,
  label,
  children,
}: {
  proof: DependencyProof | null;
  rules: { id: string; label: string }[];
  label: string;
  children?: ReactNode;
}) {
  const positions = new Map(proof?.steps.map((step, index) => [step.id, index + 1]));
  const line = (id: string | null) => (id ? (positions.get(id) ?? '?') : '?');
  const labels = new Map(rules.map((rule) => [rule.id, rule.label]));

  return (
    <details>
      <summary>{label}</summary>
      {!proof ? (
        <p>No proof entered.</p>
      ) : !proof.steps.length ? (
        <p>No proof lines entered.</p>
      ) : (
        <ol>
          {proof.steps.map((step, index) => (
            <li key={index}>
              <code>{step.formula || '(blank)'}</code> —{' '}
              {step.kind === 'inference' ? (
                <>
                  {step.ruleId
                    ? (labels.get(step.ruleId) ?? 'Rule not enabled')
                    : 'No rule selected'}
                  ; lines {step.lineReferences.map(line).join(', ') || 'none'}; discharge{' '}
                  {step.discharges
                    .map((pair) => `${line(pair.assumptionId)}–${line(pair.conclusionId)}`)
                    .join(', ') || 'none'}
                </>
              ) : step.kind === 'premise' ? (
                'Premise'
              ) : (
                'Assumption'
              )}
              ; dependencies {'{'}
              {step.dependencies.map(line).join(', ')}
              {'}'}
            </li>
          ))}
        </ol>
      )}
      {children}
    </details>
  );
}
