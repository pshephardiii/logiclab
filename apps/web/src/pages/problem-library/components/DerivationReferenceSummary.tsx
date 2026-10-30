import type { DerivationDefinition } from '@logiclab/contracts/derivation';

/** Read-only private reference; unresolved draft citations remain visible as question marks. */
export function DerivationReferenceSummary({ definition }: { definition: DerivationDefinition }) {
  const reference = definition.referenceProof;
  const lines = new Map(reference?.steps.map((step, index) => [step.id, index + 1]));
  const line = (id: string | null) => (id ? (lines.get(id) ?? '?') : '?');
  const blocks = new Map(
    reference?.blocks.map((block) => [
      block.id,
      `${line(block.assumptionId)}–${line(block.endId)}`,
    ]),
  );
  const labels = new Map(definition.rules.map((rule) => [rule.id, rule.label]));
  return (
    <details>
      <summary>Private reference proof</summary>
      {reference ? (
        <ol>
          {reference.steps.map((step, index) => (
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
        <p>No reference proof saved.</p>
      )}
      {reference?.steps.length === 0 && <p>No reference lines saved.</p>}
      <p>{definition.explanation || 'No explanation.'}</p>
    </details>
  );
}
