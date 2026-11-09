import { useState } from 'react';
import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';
import { getRuleReference } from './rule-reference';
import { RuleExample, type ProofHelpFormat } from './RuleExample';
import './proof-reference.css';

export function ProofRuleHelp({
  ruleId,
  rules,
  format,
}: {
  ruleId: string | null;
  rules: { id: string; label: string }[];
  format: ProofHelpFormat;
}) {
  const [open, setOpen] = useState(false);
  const enabled = rules.find((rule) => rule.id === ruleId);
  const rule = enabled && getPropositionalRule(enabled.id);
  if (!rule) return null;

  const guide = getRuleReference(rule.id);
  return (
    <details className="proof-rule-help" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Rule help: {enabled.label}</summary>
      {open && (
        <div className="proof-rule-content">
          <div className="rule-pattern" role="group" aria-label="Abstract rule pattern">
            <div className="rule-pattern-inputs">
              {guide.premises.map((formula, index) => (
                <code key={index}>{formula}</code>
              ))}
              {guide.branches?.map((branch, index) => (
                <div className="rule-pattern-branch" key={index}>
                  <span>
                    Assume <code>{branch.assumption}</code>
                  </span>
                  <span>⋮</span>
                  <span>
                    Establish <code>{branch.conclusion}</code>
                  </span>
                </div>
              ))}
              {!guide.premises.length && !guide.branches?.length && <span>No inputs</span>}
            </div>
            <div className="rule-pattern-conclusion">
              <code>{guide.conclusion}</code>
            </div>
          </div>
          <RuleExample lines={guide.example} format={format} rules={rules} />
        </div>
      )}
    </details>
  );
}
