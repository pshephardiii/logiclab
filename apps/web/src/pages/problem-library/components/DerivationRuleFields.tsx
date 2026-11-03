import {
  DERIVATION_AUTHORING_LIMITS,
  type DerivationDefinition,
} from '@logiclab/contracts/derivation';
import { PROPOSITIONAL_RULE_CATALOG } from '@logiclab/logic-engine/proof/rules';
import type { ProblemEditorFields } from '../helpers/problem-editor';

type Props = {
  rules: DerivationDefinition['rules'];
  labels: ProblemEditorFields['derivationLabels'];
  onChange: (
    rules: DerivationDefinition['rules'],
    labels: ProblemEditorFields['derivationLabels'],
  ) => void;
};

/** Preserve label drafts for disabled rules; the parent retains the full authored definition. */
export function DerivationRuleFields({ rules, labels, onChange }: Props) {
  return (
    <section aria-label="Derivation rules">
      <h3>Permitted rules and labels</h3>
      <p className="help">
        Enable each permitted rule explicitly. Choose a suggested label or type your own; labels do
        not change the rule. Enabled labels must be distinct, including case and spacing variations.
      </p>
      {PROPOSITIONAL_RULE_CATALOG.map((rule) => {
        const enabled = rules.some((value) => value.id === rule.id);
        const label = labels[rule.id] ?? rule.label;
        return (
          <div className="problem-option" key={rule.id}>
            <label className="correct-option">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...rules, { id: rule.id, label }]
                      : rules.filter((value) => value.id !== rule.id),
                    labels,
                  )
                }
              />
              Allow {rule.label}
            </label>
            <p className="help">
              {rule.category === 'classical' ? 'Classical rule. ' : ''}Cites {rule.lineReferences}{' '}
              line(s) and {rule.subproofReferences} subproof(s).
            </p>
            <label htmlFor={`rule-label-${rule.id}`}>Label for {rule.label}</label>
            <input
              id={`rule-label-${rule.id}`}
              list={`rule-suggestions-${rule.id}`}
              disabled={!enabled}
              maxLength={DERIVATION_AUTHORING_LIMITS.ruleLabel}
              value={label}
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
        );
      })}
    </section>
  );
}
