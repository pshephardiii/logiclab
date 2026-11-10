import type { ReactNode } from 'react';
import type { PROPOSITIONAL_RULE_CATALOG } from '@logiclab/logic-engine/proof/rules';

type Rule = (typeof PROPOSITIONAL_RULE_CATALOG)[number];

export function ProofRuleChoice({
  rule,
  selected,
  onChange,
  renderDetails,
}: {
  rule: Rule;
  selected: string[];
  onChange: (ids: string[]) => void;
  renderDetails?: (rule: Rule) => ReactNode;
}) {
  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={selected.includes(rule.id)}
          onChange={(event) =>
            onChange(
              event.target.checked
                ? [...selected, rule.id]
                : selected.filter((id) => id !== rule.id),
            )
          }
        />
        <span>{rule.label}</span>
      </label>
      {renderDetails?.(rule)}
    </div>
  );
}
