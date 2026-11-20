import { truthTreeFormulaLabel } from '../helpers/formula-presentation';
import type { TruthTreeContent } from '@logiclab/contracts/truth-tree-authoring';

/** Public statement shared by owner-library and assigned-work read-only views. */
export function TruthTreeSummary({ definition }: { definition: TruthTreeContent }) {
  return (
    <section aria-label="Truth-tree statement">
      <p>
        <strong>Truth tree</strong>
      </p>
      <h3>Premises</h3>
      {definition.premises.length ? (
        <ol>
          {definition.premises.map((premise) => (
            <li key={premise.id}>
              <code>{truthTreeFormulaLabel(premise.formula)}</code>
            </li>
          ))}
        </ol>
      ) : (
        <p>No premises.</p>
      )}
      <p>
        <strong>Conclusion:</strong> <code>{truthTreeFormulaLabel(definition.conclusion)}</code>
      </p>
    </section>
  );
}
