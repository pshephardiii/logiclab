import type { DependencyProofStep } from '@logiclab/contracts';
import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';
import { proofNotation } from '../helpers/proof-notation';
import { ProofChoice } from '../components/ProofChoice';

type Inference = Extract<DependencyProofStep, { kind: 'inference' }>;

export function DependencyInferenceFields({
  step,
  index,
  steps,
  onChange,
  onStartAssumption,
}: {
  step: Inference;
  index: number;
  steps: DependencyProofStep[];
  onChange: (step: Inference) => void;
  onStartAssumption?: () => void;
}) {
  const rule = step.ruleId ? getPropositionalRule(step.ruleId) : undefined;

  const earlier = steps.slice(0, index).map((line, position) => ({
    id: line.id,
    label: `${position + 1}. ${proofNotation(line.formula) || '(blank)'}`,
  }));

  return (
    <>
      {Array.from(
        { length: Math.max(rule?.lineReferences ?? 0, step.lineReferences.length) },
        (_, slot) => (
          <ProofChoice
            key={`citation-${slot}`}
            label={`Line ${index + 1} citation ${slot + 1}`}
            empty={`Cite ${slot + 1}`}
            value={step.lineReferences[slot] ?? null}
            choices={earlier}
            onChange={(id) => {
              const refs = [...step.lineReferences];

              if (id) refs[slot] = id;
              else refs.splice(slot, 1);

              onChange({ ...step, lineReferences: refs.filter(Boolean) });
            }}
          />
        ),
      )}
      {Array.from(
        { length: Math.max(rule?.subproofReferences ?? 0, step.discharges.length) },
        (_, slot) => {
          const pair = step.discharges[slot] ?? { assumptionId: null, conclusionId: null };

          function change(patch: Partial<typeof pair>) {
            const discharges = [...step.discharges];

            while (discharges.length <= slot)
              discharges.push({ assumptionId: null, conclusionId: null });

            discharges[slot] = { ...pair, ...patch };

            onChange({ ...step, discharges });
          }

          const assumptions = earlier.filter(
            (choice) => steps.find((line) => line.id === choice.id)?.kind === 'assumption',
          );
          const assumptionIndex = steps.findIndex((line) => line.id === pair.assumptionId);

          if (!assumptions.length && !pair.assumptionId && !pair.conclusionId) {
            return slot === 0 ? (
              onStartAssumption ? (
                <button
                  key="start-assumption"
                  type="button"
                  className="secondary"
                  onClick={onStartAssumption}
                >
                  Start assumption
                </button>
              ) : (
                <span key="missing-assumption">Add an assumption before this line.</span>
              )
            ) : null;
          }

          return (
            <div className="dependency-discharge" key={`discharge-${slot}`}>
              <ProofChoice
                label={`Line ${index + 1} discharge ${slot + 1} assumption`}
                empty="Discharge assumption"
                value={pair.assumptionId}
                choices={assumptions}
                onChange={(assumptionId) => change({ assumptionId })}
              />
              <ProofChoice
                label={`Line ${index + 1} discharge ${slot + 1} conclusion`}
                empty="Concluding line"
                value={pair.conclusionId}
                choices={earlier.filter(
                  (_, position) => assumptionIndex >= 0 && position >= assumptionIndex,
                )}
                onChange={(conclusionId) => change({ conclusionId })}
              />
              {slot < step.discharges.length && (
                <button
                  type="button"
                  className="text-button"
                  aria-label={`Remove line ${index + 1} discharge ${slot + 1}`}
                  onClick={() =>
                    onChange({ ...step, discharges: step.discharges.filter((_, i) => i !== slot) })
                  }
                >
                  ×
                </button>
              )}
            </div>
          );
        },
      )}
    </>
  );
}
