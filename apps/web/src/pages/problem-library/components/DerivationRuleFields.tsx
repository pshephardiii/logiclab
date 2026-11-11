import { ProofRulePicker } from '../../../features/proof/components/ProofRulePicker';
import {
  DERIVATION_AUTHORING_LIMITS,
  type FitchDerivationDefinition,
} from '@logiclab/contracts/derivation';
import { PROPOSITIONAL_RULE_CATALOG } from '@logiclab/logic-engine/proof/rules';
import type { ProblemEditorFields } from '../helpers/problem-editor';

type Props = {
  rules: FitchDerivationDefinition['rules'];
  labels: ProblemEditorFields['derivationLabels'];
  onChange: (
    rules: FitchDerivationDefinition['rules'],
    labels: ProblemEditorFields['derivationLabels'],
  ) => void;
};

/** Preserve label drafts for disabled rules; the parent retains the full authored definition. */
export function DerivationRuleFields({ rules, labels, onChange }: Props) {
  return (
    <ProofRulePicker
      selected={rules.map((rule) => rule.id)}
      onChange={(ids) =>
        onChange(
          ids.map((id) => ({
            id,
            label: labels[id] ?? PROPOSITIONAL_RULE_CATALOG.find((rule) => rule.id === id)!.label,
          })),
          labels,
        )
      }
      renderDetails={(rule) =>
        rules.some((value) => value.id === rule.id) && (
          <div className="proof-rule-custom-label">
            <label htmlFor={`rule-label-${rule.id}`}>Label for {rule.label}</label>
            <input
              id={`rule-label-${rule.id}`}
              list={`rule-suggestions-${rule.id}`}
              maxLength={DERIVATION_AUTHORING_LIMITS.ruleLabel}
              value={labels[rule.id] ?? rule.label}
              onChange={(event) =>
                onChange(
                  rules.map((value) =>
                    value.id === rule.id ? { ...value, label: event.target.value } : value,
                  ),
                  { ...labels, [rule.id]: event.target.value },
                )
              }
            />
            <datalist id={`rule-suggestions-${rule.id}`}>
              {[rule.label, ...rule.aliases].map((label) => (
                <option key={label} value={label} />
              ))}
            </datalist>
          </div>
        )
      }
    />
  );
}
