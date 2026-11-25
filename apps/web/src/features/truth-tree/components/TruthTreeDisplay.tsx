import { useMemo, type ReactNode, type CSSProperties } from 'react';
import type { TruthTreeContent } from '@logiclab/contracts/truth-tree-authoring';
import { truthTreeSourceFormulas } from '../helpers/source-formulas';
import type { TruthTree, TruthTreeBranch } from '@logiclab/contracts/truth-tree';
import { truthTreeFormulaLabel } from '../helpers/formula-presentation';
import { truthTreeFormulaProgress } from '../helpers/formula-progress';
import { truthTreeLayout } from '../helpers/layout';
import { branchEndingLabel, occurrenceSourceLabel } from '../helpers/display-labels';
import { TruthTreeFork } from './TruthTreeFork';
import { TruthTreeFormula } from './TruthTreeFormula';
import { TruthTreeViewport, type TreeRevealRequest } from './TruthTreeViewport';
import './truth-tree-editor.css';

/** Staggered HTML formulas and decorative forks share a grid; stored work remains unchanged. */
export function TruthTreeDisplay({
  tree,
  label = 'Truth tree',
  disabled = false,
  onFormula,
  renderBranchActions,
  entry,
  reveal,
  sources: suppliedSources,
  statement,
}: {
  tree: TruthTree;
  label?: string;
  disabled?: boolean;
  onFormula?: (id: string, formula: string) => void;
  renderBranchActions?: (branch: TruthTreeBranch, number: number) => ReactNode;
  entry?: { branchId: string; content: ReactNode };
  reveal?: TreeRevealRequest;
  sources?: ReadonlyMap<string, string>;
  statement?: TruthTreeContent;
}) {
  const sources = useMemo(
    () => suppliedSources ?? truthTreeSourceFormulas(tree, statement),
    [suppliedSources, tree, statement],
  );
  const layout = truthTreeLayout(tree, entry?.branchId);
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
  const progress = truthTreeFormulaProgress(tree, sources);
  // Reserve space for the complete formula on every path; wide trees scroll within the viewport.
  const longest = Math.max(
    0,
    ...tree.occurrences.map(
      (item) =>
        truthTreeFormulaLabel(sources.get(item.id) ?? item.formula, tree.treeVersion).length,
    ),
  );
  const formulaWidth = Math.max(10.5, longest * 0.7 + 3.5);

  return (
    <section
      aria-label={label}
      className="truth-tree-display"
      style={
        {
          '--truth-tree-formula-width': `${formulaWidth}rem`,
          '--truth-tree-leaf-width': `${formulaWidth + 1.5}rem`,
        } as CSSProperties
      }
    >
      <p className="truth-tree-marker-key">
        {tree.treeVersion === 2
          ? '✓ All components used on all paths · ◐ Components or paths remain · • No decomposition needed.'
          : '✓ Applied on all paths · ◐ Applied on some paths · • No decomposition needed.'}{' '}
        Marks track use, not correctness.
      </p>
      <TruthTreeViewport scrollable={layout.slotCount > 1 || formulaWidth > 10.5} reveal={reveal}>
        <div
          className="truth-tree-diagram"
          style={{
            width: `max(100%, calc(${layout.slotCount} * var(--truth-tree-leaf-width)))`,
            gridTemplateColumns: `repeat(${layout.slotCount * 2}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${layout.rowCount + (entry ? 1 : 0)}, minmax(3rem, auto))`,
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
                aria-label={
                  split
                    ? `Shared tree segment ${structure.branchOrder.indexOf(id) + 1}`
                    : `Branch ${branchNumbers.get(id)}`
                }
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
                          version={tree.treeVersion}
                          sourceFormula={sources?.get(item.id)}
                          progress={progress.get(item.id)}
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
                    {branchEndingLabel(branch.ending, numbers)}
                  </p>
                ) : (
                  <div
                    className="truth-tree-endpoint"
                    style={{ gridColumn: position.column, gridRow: position.endRow }}
                  >
                    <p className="truth-tree-end">
                      <span className="truth-tree-end-mark" aria-hidden="true">
                        {branch.ending.kind === 'closed' ? '×' : '○'}
                      </span>
                      <span>
                        <small>Branch {branchNumbers.get(id)}</small>
                        <span>{branchEndingLabel(branch.ending, numbers)}</span>
                      </span>
                    </p>
                    {renderBranchActions?.(branch, branchNumbers.get(id)!)}
                  </div>
                )}
              </section>
            );
          })}
          {entry && layout.branches.has(entry.branchId) && (
            <div
              className="truth-tree-entry"
              data-tree-entry={entry.branchId}
              style={{
                gridColumn: layout.branches.get(entry.branchId)!.column,
                gridRow: layout.rowCount + 1,
              }}
            >
              {entry.content}
            </div>
          )}
        </div>
      </TruthTreeViewport>
    </section>
  );
}
