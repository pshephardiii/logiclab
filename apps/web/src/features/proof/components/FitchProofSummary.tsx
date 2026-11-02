import type { DerivationContent } from '@logiclab/contracts/derivation';
import type { FitchProof } from '@logiclab/contracts';
import type { ReactNode } from 'react';

/** Read-only proof rendering; missing citations remain visible instead of being retargeted. */
export function FitchProofSummary({
  proof,
  rules,
  label,
  children,
}: {
  proof: FitchProof | null;
  rules: DerivationContent['rules'];
  label: string;
  children?: ReactNode;
}) {
  const lines = new Map(proof?.steps.map((step, index) => [step.id, index + 1]));
  const line = (id: string | null) => (id ? (lines.get(id) ?? '?') : '?');
  const blocks = new Map(
    proof?.blocks.map((block) => [block.id, `${line(block.assumptionId)}–${line(block.endId)}`]),
  );
  const labels = new Map(rules.map((rule) => [rule.id, rule.label]));
  return (
    <details>
      <summary>{label}</summary>
      {proof ? (
        <ol>
          {proof.steps.map((step, index) => (
            <li key={index}>
              <code>{step.formula || '(blank)'}</code>
              {' — '}
              {step.kind === 'inference' ? (
                <>
                  {step.ruleId
                    ? (labels.get(step.ruleId) ?? 'Rule not enabled')
                    : 'No rule selected'}
                  ; lines {step.lineReferences.map(line).join(', ') || 'none'}; subproofs{' '}
                  {step.subproofReferences.map((id) => blocks.get(id) ?? '?').join(', ') || 'none'}
                </>
              ) : step.kind === 'assumption' ? (
                'Assumption'
              ) : (
                'Premise'
              )}
              {step.blockId && <>; inside subproof {blocks.get(step.blockId) ?? '?'}</>}
            </li>
          ))}
        </ol>
      ) : (
        <p>No proof entered.</p>
      )}
      {proof?.steps.length === 0 && <p>No proof lines entered.</p>}
      {children}
    </details>
  );
}
