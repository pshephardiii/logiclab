import { updatedCitationSlots } from '../helpers/citation-slots';
import type { FitchProofStep } from '@logiclab/contracts';
import type { FitchDerivationContent } from '@logiclab/contracts/derivation';
import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';
import { ProofChoice } from './ProofChoice';
import { ProofRuleHelp } from '../reference/ProofRuleHelp';
import { ProofConjunctChoice } from './ProofConjunctChoice';
import { withoutConjunctSelection } from '../helpers/conjunct-choices';

type InferenceStep = Extract<FitchProofStep, { kind: 'inference' }>;

type Props = {
  step: InferenceStep;
  index: number;
  steps: FitchProofStep[];
  rules: FitchDerivationContent['rules'];
  blocks: { id: string; label: string; citationLabel?: string }[];
  onChange: (step: InferenceStep) => void;
  compact?: boolean;
  staged?: boolean;
  ruleCatalogVersion?: 1 | 2;
  sourceFormulas?: ReadonlyMap<string, string>;
};

/** Preserve existing citation slots and unresolved IDs when the selected rule changes. */
export function FitchInferenceFields({
  step,
  index,
  steps,
  rules,
  blocks,
  onChange,
  compact = false,
  staged = false,
  ruleCatalogVersion = 1,
  sourceFormulas,
}: Props) {
  const rule = step.ruleId ? getPropositionalRule(step.ruleId, ruleCatalogVersion) : undefined;

  return (
    <>
      {!compact && (
        <ProofChoice
          label={`Scope for line ${index + 1}`}
          value={step.blockId}
          empty="Root proof"
          choices={blocks}
          onChange={(blockId) => onChange({ ...step, blockId })}
        />
      )}
      <ProofChoice
        label={`Rule for line ${index + 1}`}
        empty={compact ? 'Rule' : 'None'}
        value={step.ruleId}
        choices={rules.map((rule) => ({ id: rule.id, label: rule.label }))}
        onChange={(ruleId) =>
          onChange({ ...(ruleId === step.ruleId ? step : withoutConjunctSelection(step)), ruleId })
        }
      />
      {!compact && <ProofRuleHelp format="fitch" rules={rules} ruleId={step.ruleId} />}
      {Array.from(
        { length: Math.max(rule?.lineReferences ?? 0, step.lineReferences.length) },
        (_, slot) => (
          <ProofChoice
            key={`line-${slot}`}
            label={`Line ${index + 1} citation ${slot + 1}`}
            placeholder={compact ? `Line ${slot + 1}` : undefined}
            value={step.lineReferences[slot] || null}
            choices={steps.slice(0, index).map((line, position) => ({
              id: line.id,
              label: `${position + 1}. ${line.formula || '(blank)'}`,
            }))}
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
        { length: Math.max(rule?.subproofReferences ?? 0, step.subproofReferences.length) },
        (_, slot) => (
          <ProofChoice
            key={`block-${slot}`}
            label={`Line ${index + 1} subproof ${slot + 1}`}
            placeholder={compact ? `Subproof ${slot + 1}` : undefined}
            value={step.subproofReferences[slot] || null}
            choices={blocks.map((block) => ({
              id: block.id,
              label: block.citationLabel ?? block.label,
            }))}
            onChange={(id) => {
              onChange({
                ...step,
                subproofReferences: updatedCitationSlots(step.subproofReferences, slot, id, staged),
              });
            }}
          />
        ),
      )}
    </>
  );
}
