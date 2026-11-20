import type { TruthTree } from '@logiclab/contracts/truth-tree';
import { truthTreeLayout } from '../helpers/layout';
import { branchEndingLabel, occurrenceSourceLabel } from '../helpers/display-labels';
import { TruthTreeFork } from './TruthTreeFork';
import { TruthTreeFormula } from './TruthTreeFormula';
import { TruthTreeViewport } from './TruthTreeViewport';
import './truth-tree-editor.css';

/** Staggered HTML formulas and decorative forks share a grid; stored work remains unchanged. */
export function TruthTreeDisplay({
  tree,
  disabled = false,
  onFormula,
}: {
  tree: TruthTree;
  disabled?: boolean;
  onFormula?: (id: string, formula: string) => void;
}) {
  const layout = truthTreeLayout(tree);
  if (!layout)
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

  const { structure, numbers, branchNumbers } = layout;

  return (
    <section aria-label="Truth tree" className="truth-tree-display">
      <TruthTreeViewport scrollable={layout.leafCount > 1}>
        <div
          className="truth-tree-diagram"
          style={{
            width: `max(100%, calc(${layout.leafCount} * var(--truth-tree-leaf-width)))`,
            gridTemplateColumns: `repeat(${layout.leafCount * 2}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${layout.rowCount}, minmax(3rem, auto))`,
          }}
        >
          {layout.forks.map((fork) => (
            <TruthTreeFork key={fork.expansionId} {...fork} />
          ))}
          {structure.branchOrder.map((id) => {
            const branch = structure.branches.get(id)!;
            const position = layout.branches.get(id)!;
            const stemRow = branch.parentId === null ? layout.rootStemRow : position.startRow;
            const split = branch.ending.kind === 'split';

            return (
              <section
                key={id}
                aria-label={`Branch ${branchNumbers.get(id)}`}
                className="truth-tree-segment"
              >
                {stemRow < position.endRow && (
                  <div
                    className="truth-tree-stem"
                    aria-hidden="true"
                    style={{
                      gridColumn: position.column,
                      gridRow: `${stemRow} / ${position.endRow}`,
                    }}
                  />
                )}
                <ol role="list" className="truth-tree-formulas">
                  {branch.occurrenceIds.map((occurrenceId) => {
                    const item = structure.occurrences.get(occurrenceId)!;
                    const expansion =
                      item.origin.kind === 'expansion' && item.origin.expansionId
                        ? structure.expansions.get(item.origin.expansionId)
                        : null;

                    return (
                      <li
                        key={item.id}
                        value={numbers.get(item.id)}
                        className="truth-tree-formula"
                        style={{ gridColumn: position.column, gridRow: layout.rows.get(item.id) }}
                      >
                        <TruthTreeFormula
                          occurrence={item}
                          number={numbers.get(item.id)!}
                          source={occurrenceSourceLabel(item, expansion, numbers)}
                          disabled={disabled}
                          onFormula={onFormula}
                        />
                      </li>
                    );
                  })}
                </ol>
                {split ? (
                  <p className="truth-tree-accessible-text">
                    {branchEndingLabel(branch.ending, numbers, branchNumbers)}
                  </p>
                ) : (
                  <p
                    className="truth-tree-end"
                    style={{ gridColumn: position.column, gridRow: position.endRow }}
                  >
                    <span className="truth-tree-end-mark" aria-hidden="true">
                      {branch.ending.kind === 'closed' ? '×' : '○'}
                    </span>
                    <span>
                      <small>Branch {branchNumbers.get(id)}</small>
                      <span>{branchEndingLabel(branch.ending, numbers, branchNumbers)}</span>
                    </span>
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </TruthTreeViewport>
    </section>
  );
}
