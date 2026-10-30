import { DerivationReferenceSummary } from './DerivationReferenceSummary';
import type { DerivationDefinition } from '@logiclab/contracts/derivation';

/** Private read-only authoring view; never use this reference-bearing view for students. */
export function DerivationSummary({ definition }: { definition: DerivationDefinition }) {
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
      <DerivationReferenceSummary definition={definition} />
    </div>
  );
}
