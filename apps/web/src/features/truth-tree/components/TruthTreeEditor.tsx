import { useEffect, useMemo, useState } from 'react';
import type { TruthTreeContent } from '@logiclab/contracts/truth-tree-authoring';
import { truthTreeSourceFormulas } from '../helpers/source-formulas';
import { terminalBranchNumbers } from '../helpers/display-labels';
import type { TruthTree, TruthTreeBranch } from '@logiclab/contracts/truth-tree';
import { TruthTreeDisplay } from './TruthTreeDisplay';
import { TruthTreeExpansionFields, emptyTreeExpansion } from './TruthTreeExpansionFields';
import {
  appendTruthTreeExpansion,
  closeTruthTreeBranch,
  reopenTruthTreeBranch,
  undoTruthTreeExpansion,
  editableTree,
} from '../helpers/construction';
import { TruthTreeClosureFields } from './TruthTreeClosureFields';
import { TruthTreeUndoDialog } from './TruthTreeUndoDialog';
import { TruthTreeBranchActions } from './TruthTreeBranchActions';
import { TruthTreeBranchEntry } from './TruthTreeBranchEntry';
import type { TreeRevealRequest } from './TruthTreeViewport';

type Props = {
  tree: TruthTree;
  statement?: TruthTreeContent;
  disabled?: boolean;
  onChange: (tree: TruthTree) => void;
  onPendingChange?: (pending: boolean) => void;
};

type ActiveEntry = { branchId: string; mode: 'expand' | 'close' };

/** Controlled tree data; one unconfirmed branch entry stays separate from saved work. */
export function TruthTreeEditor({
  tree,
  statement,
  onChange,
  onPendingChange,
  disabled = false,
}: Props) {
  const structure = editableTree(tree);
  const sourceFormulas = useMemo(() => truthTreeSourceFormulas(tree, statement), [tree, statement]);
  const [active, setActive] = useState<ActiveEntry | null>(null);
  const [entry, setEntry] = useState(emptyTreeExpansion);
  const [closureKind, setClosureKind] = useState<'complement' | 'falsity'>('complement');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<TreeRevealRequest>();
  const pending = Boolean(
    entry.sourceId ||
    entry.ruleId ||
    first ||
    second ||
    entry.formulas.some((group) => group.some(Boolean)),
  );
  const branchId = active?.branchId ?? '';
  const branch = structure?.branches.get(branchId);
  const sources = (structure?.paths.get(branchId) ?? []).map((id) => ({
    id,
    number: tree.occurrences.findIndex((item) => item.id === id) + 1,
    formula: sourceFormulas.get(id) ?? structure!.occurrences.get(id)!.formula,
  }));
  const branchNumber = structure ? (terminalBranchNumbers(structure).get(branchId) ?? 0) : 0;
  const undo = undoTruthTreeExpansion(tree);

  useEffect(() => {
    onPendingChange?.(pending);
    return () => onPendingChange?.(false);
  }, [pending, onPendingChange]);

  function discard() {
    setEntry(emptyTreeExpansion());
    setFirst('');
    setSecond('');
    setError(null);
  }

  function openEntry(branchId: string, mode: ActiveEntry['mode']) {
    if (disabled || pending) return;

    discard();
    setActive({ branchId, mode });
    setReveal({ branchId, kind: 'entry' });
  }

  function cancelEntry() {
    discard();
    setActive(null);
    if (active) setReveal({ branchId: active.branchId, kind: 'branch' });
  }

  function commit(operation: () => TruthTree, focus: (next: TruthTree) => string) {
    if (disabled) return;

    try {
      const next = operation();
      const nextBranchId = focus(next);
      onChange(next);
      discard();
      setActive(null);
      setReveal({ branchId: nextBranchId, kind: 'branch' });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update the tree.');
    }
  }

  function branchActions(branch: TruthTreeBranch, number: number) {
    return (
      <TruthTreeBranchActions
        branchId={branch.id}
        number={number}
        closed={branch.ending.kind === 'closed'}
        disabled={disabled || pending}
        activeMode={active?.branchId === branch.id ? active.mode : undefined}
        onExpand={() => openEntry(branch.id, 'expand')}
        onClose={() => openEntry(branch.id, 'close')}
        onReopen={() =>
          commit(
            () => reopenTruthTreeBranch(tree, branch.id),
            () => branch.id,
          )
        }
      />
    );
  }

  const branchEntry =
    active && branch?.ending.kind === 'open'
      ? {
          branchId,
          content: (
            <TruthTreeBranchEntry
              number={branchNumber}
              mode={active.mode}
              disabled={disabled}
              error={error}
              onDiscard={cancelEntry}
            >
              {active.mode === 'expand' ? (
                <TruthTreeExpansionFields
                  entry={entry}
                  onChange={setEntry}
                  sources={sources}
                  version={tree.treeVersion}
                  onAdd={() =>
                    commit(
                      () =>
                        appendTruthTreeExpansion(
                          tree,
                          branchId,
                          entry.sourceId,
                          entry.ruleId,
                          entry.formulas,
                          entry.chainChoice,
                          sources.find((source) => source.id === entry.sourceId)?.formula,
                        ),
                      (next) => next.expansions.at(-1)!.resultGroups[0]!.branchId,
                    )
                  }
                />
              ) : (
                <TruthTreeClosureFields
                  version={tree.treeVersion}
                  disabled={false}
                  closureKind={closureKind}
                  first={first}
                  second={second}
                  sources={sources}
                  onKindChange={(kind) => {
                    setClosureKind(kind);
                    setFirst('');
                    setSecond('');
                  }}
                  onFirstChange={setFirst}
                  onSecondChange={setSecond}
                  onClose={() =>
                    commit(
                      () =>
                        closeTruthTreeBranch(
                          tree,
                          branchId,
                          closureKind === 'falsity'
                            ? { kind: 'falsity', occurrenceId: first }
                            : { kind: 'complement', occurrenceIds: [first, second] },
                        ),
                      () => branchId,
                    )
                  }
                />
              )}
            </TruthTreeBranchEntry>
          ),
        }
      : undefined;

  return (
    <div
      className="truth-tree-editor"
      onKeyDown={(event) => {
        if (
          event.key === 'Enter' &&
          event.target instanceof HTMLInputElement &&
          !event.nativeEvent.isComposing
        )
          event.preventDefault();
      }}
    >
      <TruthTreeDisplay
        tree={tree}
        sources={sourceFormulas}
        disabled={disabled || pending}
        renderBranchActions={branchActions}
        entry={branchEntry}
        reveal={reveal}
        onFormula={(id, formula) => {
          onChange({
            ...tree,
            occurrences: tree.occurrences.map((item) =>
              item.id === id ? { ...item, formula } : item,
            ),
          });
          setError(null);
        }}
      />
      {error && !branchEntry && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {structure && (
        <div className="truth-tree-toolbar">
          <button
            type="button"
            className="secondary"
            disabled={disabled || !undo || pending}
            onClick={() => setUndoing(true)}
          >
            Undo last expansion
          </button>
        </div>
      )}
      {undoing && (
        <TruthTreeUndoDialog
          disabled={disabled || !undo}
          onCancel={() => setUndoing(false)}
          onConfirm={() => {
            if (undo)
              commit(
                () => undo,
                () => tree.expansions.at(-1)!.branchId,
              );
            setUndoing(false);
          }}
        />
      )}
    </div>
  );
}
