import { updatedCitationSlots } from '../helpers/citation-slots';
import type { DependencyProofStep } from '@logiclab/contracts';
import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';
import { formulaNotation } from '../../../components/formula/formula-notation';
import { ProofChoice } from '../components/ProofChoice';
import { ProofConjunctChoice } from '../components/ProofConjunctChoice';
import { withoutConjunctSelection } from '../helpers/conjunct-choices';

type Inference = Extract<DependencyProofStep, { kind: 'inference' }>;

export function DependencyInferenceFields({
  step,
  index,
  steps,
  onChange,
  onStartAssumption,
  staged = false,
  ruleCatalogVersion = 1,
  sourceFormulas,
}: {
  step: Inference;
  index: number;
  steps: DependencyProofStep[];
  onChange: (step: Inference) => void;
  onStartAssumption?: () => void;
  staged?: boolean;
  ruleCatalogVersion?: 1 | 2;
  sourceFormulas?: ReadonlyMap<string, string>;
}) {
  const rule = step.ruleId ? getPropositionalRule(step.ruleId, ruleCatalogVersion) : undefined;

  const earlier = steps.slice(0, index).map((line, position) => ({
    id: line.id,
    label: `${position + 1}. ${formulaNotation(line.formula) || '(blank)'}`,
  }));

  return (
    <>
      {Array.from(
        { length: Math.max(rule?.lineReferences ?? 0, step.lineReferences.length) },
        (_, slot) => (
          <ProofChoice
            key={`citation-${slot}`}
            label={`Line ${index + 1} citation ${slot + 1}`}
            placeholder={`Line ${slot + 1}`}
            value={step.lineReferences[slot] || null}
            choices={earlier}
            onChange={(id) => {
              const next =
                slot === 0 && id !== (step.lineReferences[0] || null)
                  ? withoutConjunctSelection(step)
                  : step;

              onChange({
                ...next,
                lineReferences: updatedCitationSlots(step.lineReferences, slot, id, staged),
              });
            }}
          />
        ),
      )}
      {ruleCatalogVersion === 2 && step.ruleId === 'and_chain_elimination' && (
        <ProofConjunctChoice
          index={index}
          value={step.conjunctIndex}
          source={sourceFormulas?.get(step.lineReferences[0] ?? '')}
          onChange={(conjunctIndex) => onChange({ ...step, conjunctIndex })}
        />
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
                placeholder="Discharge assumption"
                value={pair.assumptionId}
                choices={assumptions}
                onChange={(assumptionId) => change({ assumptionId })}
              />
              <ProofChoice
                label={`Line ${index + 1} discharge ${slot + 1} conclusion`}
                placeholder="Concluding line"
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
