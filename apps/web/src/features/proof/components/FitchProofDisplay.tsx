import type { FitchProof } from '@logiclab/contracts';
import { proofNotation } from '../helpers/proof-notation';
import { fitchDisplayScope } from '../helpers/fitch-display';
import './fitch-proof-display.css';

/** Show entered scope and references, including broken ones, without checking correctness. */
export function FitchProofDisplay({
  proof,
  rules,
  selectedId,
  onEdit,
}: {
  proof: FitchProof;
  rules: { id: string; label: string }[];
  selectedId: string | null;
  onEdit: (id: string) => void;
}) {
  const positions = new Map(proof.steps.map((step, index) => [step.id, index + 1]));
  const blocks = new Map(proof.blocks.map((block) => [block.id, block]));
  const labels = new Map(rules.map((rule) => [rule.id, rule.label]));
  const line = (id: string | null) => (id ? (positions.get(id) ?? 'Missing line') : 'Not selected');
  const firstDerived = proof.steps.findIndex((step) => step.kind !== 'premise');
  const premiseBoundary = firstDerived === -1 ? proof.steps.length - 1 : firstDerived - 1;

  return (
    <div
      className="fitch-proof-display"
      role="region"
      aria-label="Entered Fitch proof"
      tabIndex={0}
    >
      <table>
        <caption>Entered proof</caption>
        <thead>
          <tr>
            <th scope="col">Line</th>
            <th scope="col">Formula</th>
            <th scope="col">Justification</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {proof.steps.map((step, index) => {
            const scope = fitchDisplayScope(step.blockId, blocks);

            return (
              <tr
                key={step.id}
                className={step.id === selectedId ? 'selected-proof-line' : undefined}
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
                              ? `${line(block.assumptionId)}–${block.endId ? line(block.endId) : 'open'}`
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
                <td>
                  <button
                    type="button"
                    className="text-button"
                    aria-pressed={step.id === selectedId}
                    onClick={() => onEdit(step.id)}
                  >
                    Edit line {index + 1}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!proof.steps.length && <p>No proof lines entered yet.</p>}
    </div>
  );
}
