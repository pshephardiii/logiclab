import type { DependencyProof } from '@logiclab/contracts';
import './dependency-proof-display.css';

/** Display entered work, not checker output. References always resolve by stable identity. */
export function DependencyProofDisplay({
  proof,
  rules,
  selectedId,
  onEdit,
}: {
  proof: DependencyProof;
  rules: { id: string; label: string }[];
  selectedId: string | null;
  onEdit: (id: string) => void;
}) {
  const positions = new Map(proof.steps.map((step, index) => [step.id, index + 1]));
  const labels = new Map(rules.map((rule) => [rule.id, rule.label]));
  const line = (id: string | null) => (id ? (positions.get(id) ?? 'Missing line') : 'Not selected');

  return (
    <div
      className="dependency-proof-display"
      role="region"
      aria-label="Entered dependency proof"
      tabIndex={0}
    >
      <table>
        <caption>Entered proof — not a verification result.</caption>
        <thead>
          <tr>
            <th scope="col">Line</th>
            <th scope="col">Dependencies</th>
            <th scope="col">Formula</th>
            <th scope="col">Justification</th>
            <th scope="col">Edit</th>
          </tr>
        </thead>
        <tbody>
          {proof.steps.map((step, index) => (
            <tr
              key={step.id}
              className={step.id === selectedId ? 'selected-proof-line' : undefined}
            >
              <th scope="row">{index + 1}</th>
              <td>
                {'{'}
                {step.dependencies.map(line).join(', ')}
                {'}'}
              </td>
              <td>
                <code>{step.formula || '(blank)'}</code>
              </td>
              <td>
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
              <td>
                <button
                  type="button"
                  className="text-button"
                  aria-pressed={step.id === selectedId}
                  aria-label={`Edit line ${index + 1}`}
                  onClick={() => onEdit(step.id)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!proof.steps.length && <p>No proof lines entered yet.</p>}
    </div>
  );
}
