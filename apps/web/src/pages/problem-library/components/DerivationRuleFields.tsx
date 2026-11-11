import { ProofRulePicker } from '../../../features/proof/components/ProofRulePicker';
import {
  DERIVATION_AUTHORING_LIMITS,
  type FitchDerivationDefinition,
} from '@logiclab/contracts/derivation';
import { PROPOSITIONAL_RULE_CATALOG } from '@logiclab/logic-engine/proof/rules';
import type { ProblemEditorFields } from '../helpers/problem-editor';

type Props = {
  format: 'fitch' | 'dependency' | 'tree';
  rules: FitchDerivationDefinition['rules'];
  labels: ProblemEditorFields['derivationLabels'];
  onChange: (
    rules: FitchDerivationDefinition['rules'],
    labels: ProblemEditorFields['derivationLabels'],
  ) => void;
};

/** Preserve label drafts for disabled rules; the parent retains the full authored definition. */
export function DerivationRuleFields({ format, rules, labels, onChange }: Props) {
  if (format !== 'tree')
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
              line(s) and {rule.subproofReferences}{' '}
              {format === 'tree' ? 'discharged subtree(s)' : 'subproof(s)'}.
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
