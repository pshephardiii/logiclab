import type { DependencyProof } from '@logiclab/contracts';
import './dependency-proof-display.css';
import type { ReactNode } from 'react';
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
  entry,
  entryLabel,
}: {
  proof: DependencyProof;
  rules: { id: string; label: string }[];
  selectedId: string | null;
  onEdit: (id: string) => void;
  disabled?: boolean;
  onMove: (index: number, delta: -1 | 1) => void;
  onInsert: (id: string) => void;
  onDelete: (id: string) => void;
  entry?: ReactNode;
  entryLabel: string;
}) {
  const positions = new Map(proof.steps.map((step, index) => [step.id, index + 1]));
  const labels = new Map(rules.map((rule) => [rule.id, rule.label]));
  const line = (id: string | null) => (id ? (positions.get(id) ?? 'Missing line') : 'Not selected');
  const firstDerived = proof.steps.findIndex((step) => step.kind !== 'premise');
  const premiseBoundary = firstDerived === -1 ? proof.steps.length - 1 : firstDerived - 1;

  return (
    <div
      className="dependency-proof-display"
      role="region"
      aria-label="Entered dependency proof"
      tabIndex={0}
    >
      <table>
        <caption>Entered proof</caption>
        <thead>
          <tr>
            <th scope="col">Dependencies</th>
            <th scope="col">Line</th>
            <th scope="col">Formula</th>
            <th scope="col">Justification</th>
            <th scope="col">Actions</th>
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
                {step.dependencies.map(line).join(', ')}
                {'}'}
              </td>
              <th className="proof-line-number" scope="row">
                {index + 1}
              </th>
              <td className="proof-line-formula">
                <code>{step.formula || '(blank)'}</code>
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
              <td className="proof-line-action">
                <DependencyLineActions
                  index={index}
                  count={proof.steps.length}
                  disabled={disabled}
                  onEdit={() => onEdit(step.id)}
                  onMove={(delta) => onMove(index, delta)}
                  onInsert={() => onInsert(step.id)}
                  onDelete={() => onDelete(step.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
        {entry && <tfoot aria-label={entryLabel}>{entry}</tfoot>}
      </table>
      {!proof.steps.length && <p>No proof lines entered yet.</p>}
    </div>
  );
}
