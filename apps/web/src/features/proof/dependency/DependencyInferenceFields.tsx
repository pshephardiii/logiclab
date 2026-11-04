import type { DependencyProofStep } from '@logiclab/contracts';
import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';
import { ProofChoice } from '../components/ProofChoice';

type Inference = Extract<DependencyProofStep, { kind: 'inference' }>;
export function DependencyInferenceFields({
  step,
  index,
  steps,
  rules,
  onChange,
}: {
  step: Inference;
  index: number;
  steps: DependencyProofStep[];
  rules: { id: string; label: string }[];
  onChange: (step: Inference) => void;
}) {
  const rule = step.ruleId ? getPropositionalRule(step.ruleId) : undefined;
  const earlier = steps.slice(0, index).map((line, position) => ({
    id: line.id,
    label: `${position + 1}. ${line.formula || '(blank)'}`,
  }));
  return (
    <>
      <ProofChoice
        label={`Rule for line ${index + 1}`}
        value={step.ruleId}
        choices={rules}
        onChange={(ruleId) => onChange({ ...step, ruleId })}
      />
      {Array.from(
        { length: Math.max(rule?.lineReferences ?? 0, step.lineReferences.length) },
        (_, slot) => (
          <ProofChoice
            key={`citation-${slot}`}
            label={`Line ${index + 1} citation ${slot + 1}`}
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
          return (
            <div key={`discharge-${slot}`}>
              <ProofChoice
                label={`Line ${index + 1} discharge ${slot + 1} assumption`}
                value={pair.assumptionId}
                choices={earlier.filter(
                  (choice) => steps.find((line) => line.id === choice.id)?.kind === 'assumption',
                )}
                onChange={(assumptionId) => change({ assumptionId })}
              />
              <ProofChoice
                label={`Line ${index + 1} discharge ${slot + 1} conclusion`}
                value={pair.conclusionId}
                choices={earlier}
                onChange={(conclusionId) => change({ conclusionId })}
              />
              {slot < step.discharges.length && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    onChange({ ...step, discharges: step.discharges.filter((_, i) => i !== slot) })
                  }
                >
                  Remove line {index + 1} discharge {slot + 1}
                </button>
              )}
            </div>
          );
        },
      )}
    </>
  );
}
