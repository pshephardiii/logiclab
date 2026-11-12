import { FitchLineActions } from './FitchLineActions';
import type { ReactNode } from 'react';
import type { FitchProof } from '@logiclab/contracts';
import { proofNotation } from '../helpers/proof-notation';
import { fitchDisplayScope } from '../helpers/fitch-display';
import './fitch-proof-display.css';

/** Show entered scope and references, including broken ones, without checking correctness. */
export function FitchProofDisplay({
  proof,
  rules,
  selectedId = null,
  onEdit,
  readOnly = false,
  label = 'Entered Fitch proof',
  disabled = false,
  entry,
  entryLabel = 'New proof line',
  onMove,
  onInsert,
  onDelete,
  onBlockSettings,
  onDeleteBlock,
  onCloseBlock,
  onReopenBlock,
  renderLine,
  onContinueBlock,
}: {
  proof: FitchProof;
  rules: { id: string; label: string }[];
  selectedId?: string | null;
  onEdit?: (id: string) => void;
  readOnly?: boolean;
  label?: string;
  disabled?: boolean;
  entry?: ReactNode;
  entryLabel?: string;
  onMove?: (index: number, delta: -1 | 1) => void;
  onInsert?: (id: string) => void;
  onDelete?: (id: string) => void;
  onBlockSettings?: (id: string) => void;
  onDeleteBlock?: (id: string) => void;
  onCloseBlock?: (id: string, endId: string) => void;
  onReopenBlock?: (id: string) => void;
  onContinueBlock?: (id: string) => void;
  renderLine?: (step: FitchProof['steps'][number], index: number, actions: ReactNode) => ReactNode;
}) {
  const positions = new Map(proof.steps.map((step, index) => [step.id, index + 1]));
  const blocks = new Map(proof.blocks.map((block) => [block.id, block]));
  const labels = new Map(rules.map((rule) => [rule.id, rule.label]));
  const line = (id: string | null) => (id ? (positions.get(id) ?? 'Missing line') : 'Not selected');
  const firstDerived = proof.steps.findIndex((step) => step.kind !== 'premise');
  const premiseBoundary = firstDerived === -1 ? proof.steps.length - 1 : firstDerived - 1;

  return (
    <div className="fitch-proof-display" role="region" aria-label={label} tabIndex={0}>
      <table>
        <caption>Entered proof</caption>
        <thead>
          <tr>
            <th scope="col">Line</th>
            <th scope="col">Formula</th>
            <th scope="col">Justification</th>
            {!readOnly && onEdit && <th scope="col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {proof.steps.map((step, index) => {
            const scope = fitchDisplayScope(step.blockId, blocks);
            const opening =
              step.kind === 'assumption'
                ? proof.blocks.find((block) => block.assumptionId === step.id)
                : undefined;
            const containing = step.blockId ? blocks.get(step.blockId) : undefined;

            const actions =
              !readOnly && onEdit ? (
                <FitchLineActions
                  index={index}
                  count={proof.steps.length}
                  disabled={disabled}
                  onEdit={() => onEdit(step.id)}
                  onMove={onMove ? (delta) => onMove(index, delta) : undefined}
                  onInsert={onInsert ? () => onInsert(step.id) : undefined}
                  onDelete={
                    step.kind !== 'assumption' && onDelete ? () => onDelete(step.id) : undefined
                  }
                  onSettings={
                    opening && onBlockSettings ? () => onBlockSettings(opening.id) : undefined
                  }
                  onDeleteSubproof={
                    opening && onDeleteBlock ? () => onDeleteBlock(opening.id) : undefined
                  }
                  onCloseSubproof={
                    containing && onCloseBlock && containing.endId === null
                      ? () => onCloseBlock(containing.id, step.id)
                      : undefined
                  }
                  onContinueSubproof={
                    opening && opening.endId === null && onContinueBlock
                      ? () => onContinueBlock(opening.id)
                      : undefined
                  }
                  onReopenSubproof={
                    opening && opening.endId !== null && onReopenBlock
                      ? () => onReopenBlock(opening.id)
                      : undefined
                  }
                />
              ) : undefined;
            const editing = !readOnly && renderLine?.(step, index, actions);
            if (editing) return editing;

            return (
              <tr
                key={step.id}
                className={!readOnly && step.id === selectedId ? 'selected-proof-line' : undefined}
              >
                <th scope="row" className="fitch-line-number">
                  {index + 1}
                </th>
                <td
                  className={`fitch-line-formula${index === premiseBoundary ? ' premise-boundary' : ''}`}
                >
                  <span
                    className="fitch-scoped-formula"
                    style={{ paddingLeft: `${scope.path.length * 0.7}rem` }}
                  >
                    <span className="fitch-scope-guides" aria-hidden="true">
                      {scope.path.map((block, depth) => (
                        <span
                          key={block.id}
                          className={`fitch-scope-guide${block.assumptionId === step.id ? ' scope-start' : ''}${block.endId === step.id ? ' scope-end' : ''}`}
                          style={{ left: `${depth * 0.7}rem` }}
                        />
                      ))}
                    </span>
                    <code>{proofNotation(step.formula) || '(blank)'}</code>
                  </span>
                </td>
                <td className="fitch-line-justification">
                  {step.kind === 'inference' ? (
                    <>
                      {step.ruleId
                        ? (labels.get(step.ruleId) ?? 'Unavailable rule')
                        : 'No rule selected'}
                      {step.lineReferences.length > 0 &&
                        ` · ${step.lineReferences.map(line).join(', ')}`}
                      {step.subproofReferences.length > 0 &&
                        ` · subproof ${step.subproofReferences
                          .map((id) => {
                            const block = blocks.get(id);
                            return block
                              ? block.endId
                                ? `${line(block.assumptionId)}–${line(block.endId)}`
                                : `starting at line ${line(block.assumptionId)} (not closed)`
                              : 'Missing subproof';
                          })
                          .join(', ')}`}
                    </>
                  ) : step.kind === 'premise' ? (
                    'Premise'
                  ) : (
                    'Assumption'
                  )}
                  {scope.path.length > 0 && (
                    <span className="proof-control-label">
                      Inside subproof{' '}
                      {scope.path.map((block) => line(block.assumptionId)).join(', ')}
                    </span>
                  )}
                  {scope.warning && <span className="fitch-scope-warning">{scope.warning}</span>}
                </td>
                {!readOnly && onEdit && <td>{actions}</td>}
              </tr>
            );
          })}
        </tbody>
        {!readOnly && entry && <tfoot aria-label={entryLabel}>{entry}</tfoot>}
      </table>
      {!proof.steps.length && <p>No proof lines entered yet.</p>}
    </div>
  );
}
