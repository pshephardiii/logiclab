import { TRUTH_TREE_LIMITS, type TruthTree } from '@logiclab/contracts/truth-tree';
import { ProofFormulaInput } from '../../proof/components/ProofFormulaInput';
import { editableTree } from '../helpers/construction';
import { branchEndingLabel, occurrenceSourceLabel } from '../helpers/display-labels';
import './truth-tree-editor.css';

/** Ordered branch segments retain their identities and show inherited sources by number. */
export function TruthTreeDisplay({
  tree,
  disabled = false,
  onFormula,
}: {
  tree: TruthTree;
  disabled?: boolean;
  onFormula?: (id: string, formula: string) => void;
}) {
  const structure = editableTree(tree);
  if (!structure)
    return (
      <section aria-label="Saved tree formulas">
        <p role="alert">
          This saved tree has unfinished or unsafe structure. Rebuild it from the statement to use
          the construction controls.
        </p>
        <ol>
          {tree.occurrences.map((item, index) => (
            <li key={`${item.id}:${index}`}>
              <code>{item.formula || '(blank)'}</code>
            </li>
          ))}
        </ol>
      </section>
    );

  const numbers = new Map(tree.occurrences.map((item, index) => [item.id, index + 1]));
  const branchNumbers = new Map(structure.branchOrder.map((id, index) => [id, index + 1]));
  const depths = new Map<string, number>();

  return (
    <section aria-label="Truth tree" className="truth-tree-display">
      {structure.branchOrder.map((id) => {
        const branch = structure.branches.get(id)!;
        const depth = branch.parentId === null ? 0 : (depths.get(branch.parentId) ?? 0) + 1;
        depths.set(id, depth);
        return (
          <section
            key={id}
            aria-label={`Branch ${branchNumbers.get(id)}`}
            style={{ marginLeft: `${Math.min(depth, 6) * 0.75}rem` }}
          >
            <h3>
              Branch {branchNumbers.get(id)}
              {branch.parentId && ` (from branch ${branchNumbers.get(branch.parentId)})`}
            </h3>
            <ol>
              {branch.occurrenceIds.map((occurrenceId) => {
                const item = structure.occurrences.get(occurrenceId)!;
                const expansion =
                  item.origin.kind === 'expansion' && item.origin.expansionId
                    ? structure.expansions.get(item.origin.expansionId)
                    : null;
                return (
                  <li key={item.id} value={numbers.get(item.id)}>
                    {onFormula && item.origin.kind === 'expansion' ? (
                      <ProofFormulaInput
                        aria-label={`Formula ${numbers.get(item.id)}`}
                        value={item.formula}
                        maxLength={TRUTH_TREE_LIMITS.maxFormulaLength}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        disabled={disabled}
                        onValueChange={(formula) => onFormula(item.id, formula)}
                      />
                    ) : (
                      <code>{item.formula || '(blank)'}</code>
                    )}
                    <small>{occurrenceSourceLabel(item, expansion, numbers)}</small>
                  </li>
                );
              })}
            </ol>
            <p>{branchEndingLabel(branch.ending, numbers, branchNumbers)}</p>
          </section>
        );
      })}
    </section>
  );
}
