import { useId, useState } from 'react';
import { ProofKeyboardGuide } from './ProofKeyboardGuide';
import { ProofRuleReference } from './ProofRuleHelp';
import type { ProofHelpFormat } from './RuleExample';

/** Only configured labels and the format enter this reference boundary; no proof or answer key. */
export function ProofHelp({
  format,
  rules,
}: {
  format: ProofHelpFormat;
  rules: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState('');
  const choiceId = useId();
  const selected = rules.some((rule) => rule.id === chosen) ? chosen : (rules[0]?.id ?? '');
  return (
    <div className="proof-help">
      <ProofKeyboardGuide />
      <details onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>Rule reference ({rules.length} enabled)</summary>
        {open && (
          <>
            {!rules.length && <p>No inference rules are enabled.</p>}
            {rules.length > 0 && (
              <>
                <label htmlFor={choiceId}>Reference rule</label>
                <select
                  id={choiceId}
                  value={selected}
                  onChange={(event) => setChosen(event.target.value)}
                >
                  {rules.map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.label}
                    </option>
                  ))}
                </select>
                <ProofRuleReference ruleId={selected} rules={rules} format={format} />
              </>
            )}
          </>
        )}
      </details>
    </div>
  );
}
