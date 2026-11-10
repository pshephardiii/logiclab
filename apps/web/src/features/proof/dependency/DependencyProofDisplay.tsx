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
}) {
  const assumptions = dependencyAssumptionGuides(proof.steps);
  const positions = new Map(proof.steps.map((step, index) => [step.id, index + 1]));
  const labels = new Map(rules.map((rule) => [rule.id, rule.label]));
  const line = (id: string | null) => (id ? (positions.get(id) ?? 'Missing line') : 'Not selected');
  const firstDerived = proof.steps.findIndex((step) => step.kind !== 'premise');
  const premiseBoundary = firstDerived === -1 ? proof.steps.length - 1 : firstDerived - 1;

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
                {index + 1}
              </th>
              <td className="proof-line-formula">
                <span className="dependency-assumption-guides" aria-hidden="true">
                  {assumptions.guides
                    .filter((guide) => guide.start <= index && guide.end >= index)
                    .map((guide) => (
                      <span
                        key={guide.id}
                        className={`dependency-assumption-guide${guide.start === index ? ' guide-start' : ''}${guide.closed && guide.end === index ? ' guide-end' : ''}`}
                        style={{ left: `${guide.lane * 0.6}rem` }}
                        title={`Assumption on line ${guide.line}`}
                      />
                    ))}
                </span>
                <code>{proofNotation(step.formula) || '(blank)'}</code>
              </td>
              <td className="proof-line-justification">
                {step.kind === 'inference' ? (
                  <>
                    {step.ruleId
                      ? (labels.get(step.ruleId) ?? 'Unavailable rule')
                      : 'No rule selected'}
                    {step.lineReferences.length > 0 &&
                      ` · ${step.lineReferences.map(line).join(', ')}`}
                    {step.discharges.length > 0 && (
                      <>
                        {' '}
                        · discharge{' '}
                        {step.discharges
                          .map((pair) => `${line(pair.assumptionId)}–${line(pair.conclusionId)}`)
                          .join(', ')}
                      </>
                    )}
                  </>
                ) : step.kind === 'premise' ? (
                  'Premise'
                ) : (
                  'Assumption'
                )}
              </td>
              {!readOnly && onEdit && onMove && onInsert && onDelete && (
                <td className="proof-line-action">
                  <DependencyLineActions
                    index={index}
                    count={proof.steps.length}
                    disabled={disabled}
                    onEdit={() => onEdit(step.id)}
                    onMove={(delta) => onMove(index, delta)}
                    onInsert={() => onInsert(step.id)}
                    onDelete={() => onDelete(step.id)}
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
