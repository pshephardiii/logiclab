import type { ProofStep } from '@logiclab/contracts';
import type { DerivationContent } from '@logiclab/contracts/derivation';
import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';
import { ProofChoice } from './ProofChoice';

type InferenceStep = Extract<ProofStep, { kind: 'inference' }>;

type Props = {
  step: InferenceStep;
  index: number;
  steps: ProofStep[];
  rules: DerivationContent['rules'];
  blocks: { id: string; label: string }[];
  onChange: (step: InferenceStep) => void;
};

/** Preserve existing citation slots and unresolved IDs when the selected rule changes. */
export function FitchInferenceFields({ step, index, steps, rules, blocks, onChange }: Props) {
  const rule = step.ruleId ? getPropositionalRule(step.ruleId) : undefined;

  return (
    <>
      <ProofChoice
        label={`Scope for line ${index + 1}`}
        value={step.blockId}
        empty="Root proof"
        choices={blocks}
        onChange={(blockId) => onChange({ ...step, blockId })}
      />
      <ProofChoice
        label={`Rule for line ${index + 1}`}
        value={step.ruleId}
        choices={rules.map((rule) => ({ id: rule.id, label: rule.label }))}
        onChange={(ruleId) => onChange({ ...step, ruleId })}
      />
      {Array.from(
        { length: Math.max(rule?.lineReferences ?? 0, step.lineReferences.length) },
        (_, slot) => (
          <ProofChoice
            key={`line-${slot}`}
            label={`Line ${index + 1} citation ${slot + 1}`}
            value={step.lineReferences[slot] ?? null}
            choices={steps.slice(0, index).map((line, position) => ({
              id: line.id,
              label: `${position + 1}. ${line.formula || '(blank)'}`,
            }))}
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
        { length: Math.max(rule?.subproofReferences ?? 0, step.subproofReferences.length) },
        (_, slot) => (
          <ProofChoice
            key={`block-${slot}`}
            label={`Line ${index + 1} subproof ${slot + 1}`}
            value={step.subproofReferences[slot] ?? null}
            choices={blocks}
            onChange={(id) => {
              const refs = [...step.subproofReferences];

              if (id) refs[slot] = id;
              else refs.splice(slot, 1);

              onChange({ ...step, subproofReferences: refs.filter(Boolean) });
            }}
          />
        ),
      )}
    </>
  );
}
