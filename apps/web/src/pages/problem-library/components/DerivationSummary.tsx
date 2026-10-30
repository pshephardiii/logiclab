import type { DerivationDefinition } from '@logiclab/contracts/derivation';

/** Private read-only authoring view; never use this reference-bearing view for students. */
export function DerivationSummary({ definition }: { definition: DerivationDefinition }) {
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
    <div>
      <p>
        <strong>Format:</strong> Fitch
      </p>
      <h3>Premises</h3>
      {definition.premises.length ? (
        <ol>
          {definition.premises.map((premise) => (
            <li key={premise.id}>
              <code>{premise.formula || '(blank)'}</code>
            </li>
          ))}
        </ol>
      ) : (
        <p>No premises.</p>
      )}
      <p>
        <strong>Conclusion:</strong> <code>{definition.conclusion || '(blank)'}</code>
      </p>
      <h3>Permitted rules</h3>
      {definition.rules.length ? (
        <ul>
          {definition.rules.map((rule) => (
            <li key={rule.id}>{rule.label}</li>
          ))}
        </ul>
      ) : (
        <p>No rules enabled.</p>
      )}
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
                    {step.subproofReferences.map((id) => blocks.get(id) ?? '?').join(', ') ||
                      'none'}
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
    </div>
  );
}
