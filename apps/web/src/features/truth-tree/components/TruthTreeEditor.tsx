import { useEffect, useId, useState } from 'react';
import type { TruthTree } from '@logiclab/contracts/truth-tree';
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

type Props = {
  tree: TruthTree;
  disabled?: boolean;
  onChange: (tree: TruthTree) => void;
  onPendingChange?: (pending: boolean) => void;
};

/** Controlled tree data; unconfirmed expansion/closure selections never enter a save silently. */
export function TruthTreeEditor({ tree, onChange, onPendingChange, disabled = false }: Props) {
  const id = useId();
  const structure = editableTree(tree);
  const [selected, setSelected] = useState(tree.rootBranchId ?? '');
  const [entry, setEntry] = useState(emptyTreeExpansion);
  const [closureKind, setClosureKind] = useState<'complement' | 'falsity'>('complement');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = Boolean(entry.sourceId || entry.ruleId || first || second);
  const branchId = structure?.branches.has(selected) ? selected : (tree.rootBranchId ?? '');
  const branch = structure?.branches.get(branchId);
  const sources = (structure?.paths.get(branchId) ?? []).map((id) => ({
    id,
    number: tree.occurrences.findIndex((item) => item.id === id) + 1,
    formula: structure!.occurrences.get(id)!.formula,
  }));
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

  function commit(operation: () => TruthTree) {
    if (disabled) return;

    try {
      const next = operation();
      onChange(next);
      discard();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update the tree.');
    }
  }

  return (
    <div
      className="truth-tree-editor"
      onKeyDown={(event) => {
        if (
          event.key === 'Enter' &&
          (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) &&
          !event.nativeEvent.isComposing
        )
          event.preventDefault();
      }}
    >
      <TruthTreeDisplay
        tree={tree}
        disabled={disabled || pending}
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
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {structure && (
        <fieldset disabled={disabled}>
          <legend>Tree construction</legend>
          <label htmlFor={`${id}-branch`}>Branch</label>
          <select
            id={`${id}-branch`}
            value={branchId}
            disabled={pending}
            onChange={(event) => {
              setSelected(event.target.value);
              discard();
            }}
          >
            {structure.branchOrder.map((id, index) => (
              <option key={id} value={id}>
                Branch {index + 1}
              </option>
            ))}
          </select>
          {branch?.ending.kind === 'open' ? (
            <>
              <fieldset disabled={Boolean(first || second)}>
                <TruthTreeExpansionFields
                  entry={entry}
                  onChange={setEntry}
                  sources={sources}
                  onAdd={() =>
                    commit(() =>
                      appendTruthTreeExpansion(
                        tree,
                        branchId,
                        entry.sourceId,
                        entry.ruleId,
                        entry.formulas,
                      ),
                    )
                  }
                />
              </fieldset>
              <TruthTreeClosureFields
                disabled={Boolean(entry.sourceId || entry.ruleId)}
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
                  commit(() =>
                    closeTruthTreeBranch(
                      tree,
                      branchId,
                      closureKind === 'falsity'
                        ? { kind: 'falsity', occurrenceId: first }
                        : { kind: 'complement', occurrenceIds: [first, second] },
                    ),
                  )
                }
              />
            </>
          ) : branch?.ending.kind === 'closed' ? (
            <button
              type="button"
              onClick={() => commit(() => reopenTruthTreeBranch(tree, branchId))}
            >
              Reopen branch
            </button>
          ) : (
            <p>Select an open child branch to continue.</p>
          )}
          {pending && (
            <button type="button" className="secondary" onClick={discard}>
              Discard entry
            </button>
          )}
          <button
            type="button"
            className="secondary"
            disabled={!undo || pending}
            onClick={() => setUndoing(true)}
          >
            Undo last expansion
          </button>
        </fieldset>
      )}
      {undoing && (
        <TruthTreeUndoDialog
          disabled={disabled || !undo}
          onCancel={() => setUndoing(false)}
          onConfirm={() => {
            if (undo) commit(() => undo);
            setUndoing(false);
          }}
        />
      )}
    </div>
  );
}
