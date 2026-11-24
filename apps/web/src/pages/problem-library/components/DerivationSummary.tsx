import { ProblemType } from '@logiclab/contracts/problem-type';
import { formulaNotation } from '../../../components/formula/formula-notation';
import { PermittedRulesButton } from '../../../features/proof/reference/PermittedRulesButton';
import { DerivationReferenceSummary } from './DerivationReferenceSummary';
import type { LibraryProblemDefinition } from '@logiclab/contracts/problem-library';

/** Private read-only authoring view; never use this reference-bearing view for students. */
export function DerivationSummary({
  definition,
}: {
  definition: Extract<LibraryProblemDefinition, { type: typeof ProblemType.Derivation }>;
}) {
  return (
    <div>
      <p>
        <strong>Format:</strong>{' '}
        {definition.format === 'tree'
          ? 'Natural-deduction tree'
          : definition.format === 'fitch'
            ? 'Fitch'
            : 'Dependency'}
      </p>
      <h3>Premises</h3>
      {definition.premises.length ? (
        <ol>
          {definition.premises.map((premise) => (
            <li key={premise.id}>
              <code>{formulaNotation(premise.formula) || '(blank)'}</code>
            </li>
          ))}
        </ol>
      ) : (
        <p>No premises.</p>
      )}
      <p>
        <strong>Conclusion:</strong>{' '}
        <code>{formulaNotation(definition.conclusion) || '(blank)'}</code>
      </p>
      <PermittedRulesButton format={definition.format} rules={definition.rules} />
      <DerivationReferenceSummary definition={definition} />
    </div>
  );
}
