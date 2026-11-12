import { DependencyJustification } from './DependencyJustification';
import { DependencyAssumptionGuides } from './DependencyAssumptionGuides';
import { dependencyNumbers } from './dependency-numbers';
import { proofNotation } from '../helpers/proof-notation';
import type { DependencyProof } from '@logiclab/contracts';
import './dependency-proof-display.css';
import { dependencyAssumptionGuides } from './assumption-guides';
import type { CSSProperties, ReactNode } from 'react';
import { DependencyLineActions } from './DependencyLineActions';

/** Display entered work, not checker output. References always resolve by stable identity. */
export function DependencyProofDisplay({
  proof,
  rules,
  selectedId,
  onEdit,
  disabled = false,
  onMove,
  onInsert,
  onDelete,
  onDischarge,
  entry,
  entryLabel = 'New proof line',
  readOnly = false,
  label = 'Entered dependency proof',
  allowInsert = true,
  onRangeSelect,
  rangeDisabled = false,
  rangeStartId,
  rangeEndId,
}: {
  proof: DependencyProof;
  rules: { id: string; label: string }[];
  selectedId: string | null;
  onEdit?: (id: string) => void;
  disabled?: boolean;
  onMove?: (index: number, delta: -1 | 1) => void;
  onInsert?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDischarge?: (id: string) => void;
  entry?: ReactNode;
  entryLabel?: string;
  readOnly?: boolean;
  label?: string;
  allowInsert?: boolean;
  onRangeSelect?: (id: string) => void;
  rangeDisabled?: boolean;
  rangeStartId?: string;
  rangeEndId?: string;
}) {
  const assumptions = dependencyAssumptionGuides(proof.steps);
  const positions = new Map(proof.steps.map((step, index) => [step.id, index + 1]));
  const labels = new Map(rules.map((rule) => [rule.id, rule.label]));
  const line = (id: string | null) => (id ? (positions.get(id) ?? 'Missing line') : 'Not selected');
  const firstDerived = proof.steps.findIndex((step) => step.kind !== 'premise');
  const premiseBoundary = firstDerived === -1 ? proof.steps.length - 1 : firstDerived - 1;

  const start = proof.steps.findIndex((step) => step.id === rangeStartId);
  const end = rangeEndId ? proof.steps.findIndex((step) => step.id === rangeEndId) : start;
  const inRange = (index: number) =>
    start >= 0 && end >= 0 && index >= Math.min(start, end) && index <= Math.max(start, end);

  return (
    <div className="dependency-proof-display" role="region" aria-label={label} tabIndex={0}>
      <table
        style={{ '--dependency-guide-width': `${assumptions.lanes * 0.6}rem` } as CSSProperties}
      >
        <caption>Entered proof</caption>
        <thead>
          <tr>
            <th scope="col">Dependencies</th>
            <th scope="col">Line</th>
            <th scope="col">Formula</th>
            <th scope="col">Justification</th>
            {!readOnly && <th scope="col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {proof.steps.map((step, index) => (
            <tr
              key={step.id}
              className={[
                step.id === selectedId ? 'selected-proof-line' : '',
                inRange(index) ? 'selected-range-line' : '',
                index === premiseBoundary ? 'premise-boundary' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <td className="proof-line-dependencies">
                {'{'}
                {dependencyNumbers(step.dependencies, positions)}
                {'}'}
              </td>
              <th className="proof-line-number" scope="row">
                {!readOnly && onRangeSelect ? (
                  <button
                    type="button"
                    className="text-button"
                    data-proof-range
                    aria-label={`Select line ${index + 1} for deletion`}
                    aria-pressed={inRange(index)}
                    disabled={rangeDisabled}
                    onClick={() => onRangeSelect(step.id)}
                  >
                    {index + 1}
                  </button>
                ) : (
                  index + 1
                )}
              </th>
              <td className="proof-line-formula">
                <DependencyAssumptionGuides guides={assumptions.guides} index={index} />
                <code>{proofNotation(step.formula) || '(blank)'}</code>
              </td>
              <td className="proof-line-justification">
                <DependencyJustification step={step} labels={labels} line={line} />
              </td>
              {!readOnly && onEdit && onMove && (onInsert || !allowInsert) && onDelete && (
                <td className="proof-line-action">
                  <DependencyLineActions
                    index={index}
                    count={proof.steps.length}
                    disabled={disabled}
                    onEdit={() => onEdit(step.id)}
                    onMove={(delta) => onMove(index, delta)}
                    onInsert={allowInsert && onInsert ? () => onInsert(step.id) : undefined}
                    onDelete={() => onDelete(step.id)}
                    onRange={onRangeSelect ? () => onRangeSelect(step.id) : undefined}
                    onDischarge={
                      step.kind === 'assumption' && onDischarge
                        ? () => onDischarge(step.id)
                        : undefined
                    }
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {!readOnly && entry && <tfoot aria-label={entryLabel}>{entry}</tfoot>}
      </table>
      {!proof.steps.length && <p>No proof lines entered yet.</p>}
    </div>
  );
}
