import type { DerivationDefinition } from '@logiclab/contracts/derivation';
import type { FitchProof, ProofStep } from '@logiclab/contracts';
import { PROOF_LIMITS } from '@logiclab/contracts';
import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';
import { ReferenceChoice } from './ReferenceChoice';

type Props = {
  definition: DerivationDefinition;
  proof: FitchProof;
  index: number;
  blocks: { id: string; label: string }[];
  onChange: (step: ProofStep) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
};
export function ReferenceProofLine({
  definition,
  proof,
  index,
  blocks,
  onChange,
  onMove,
  onDelete,
}: Props) {
  const step = proof.steps[index]!;
  const rule =
    step.kind === 'inference' && step.ruleId ? getPropositionalRule(step.ruleId) : undefined;
  return (
    <section className="problem-option" aria-label={`Reference line ${index + 1}`}>
      <h4>
        Line {index + 1}
        {step.kind === 'assumption' ? ' — assumption' : ''}
      </h4>
      <label>
        Formula for line {index + 1}
        <input
          maxLength={PROOF_LIMITS.maxFormulaLength}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={step.formula}
          onChange={(event) => onChange({ ...step, formula: event.target.value })}
        />
      </label>
      <p>
        Kind:{' '}
        {step.kind === 'inference'
          ? 'Inference'
          : step.kind === 'premise'
            ? 'Premise'
            : 'Assumption'}
      </p>
      {step.kind === 'premise' ? (
        <>
          <p className="help">
            Match this line’s formula to its selected statement premise. Linking a premise does not
            rewrite the formula.
          </p>
          <ReferenceChoice
            label={`Statement premise for line ${index + 1}`}
            value={step.premiseId}
            choices={definition.premises.map((premise, position) => ({
              id: premise.id,
              label: `${position + 1}. ${premise.formula || '(blank)'}`,
            }))}
            onChange={(premiseId) => onChange({ ...step, premiseId })}
          />
        </>
      ) : step.kind === 'inference' ? (
        <>
          <ReferenceChoice
            label={`Scope for line ${index + 1}`}
            value={step.blockId}
            empty="Root proof"
            choices={blocks}
            onChange={(blockId) => onChange({ ...step, blockId })}
          />
          <ReferenceChoice
            label={`Rule for line ${index + 1}`}
            value={step.ruleId}
            choices={definition.rules.map((rule) => ({ id: rule.id, label: rule.label }))}
            onChange={(ruleId) => onChange({ ...step, ruleId })}
          />
          {Array.from(
            { length: Math.max(rule?.lineReferences ?? 0, step.lineReferences.length) },
            (_, slot) => (
              <ReferenceChoice
                key={`line-${slot}`}
                label={`Line ${index + 1} citation ${slot + 1}`}
                value={step.lineReferences[slot] ?? null}
                choices={proof.steps.slice(0, index).map((line, position) => ({
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
              <ReferenceChoice
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
      ) : (
        <p className="help">
          Opening assumption of{' '}
          {blocks.find((block) => block.id === step.blockId)?.label ?? 'an unavailable subproof'}.
          Use the block controls to set its parent and endpoint.
        </p>
      )}
      <div className="action-row">
        <button
          type="button"
          className="secondary"
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          Move line {index + 1} up
        </button>
        <button
          type="button"
          className="secondary"
          disabled={index === proof.steps.length - 1}
          onClick={() => onMove(1)}
        >
          Move line {index + 1} down
        </button>
        <button
          type="button"
          className="secondary"
          disabled={step.kind === 'assumption'}
          onClick={onDelete}
        >
          Delete line {index + 1}
        </button>
      </div>
    </section>
  );
}
