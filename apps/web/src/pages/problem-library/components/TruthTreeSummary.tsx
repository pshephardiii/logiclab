import type { TruthTreeContent } from '@logiclab/contracts/truth-tree-authoring';

/** Readable owner-library compatibility while the construction editor is staged separately. */
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
    </section>
  );
}
