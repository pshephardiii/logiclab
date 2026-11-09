import { useState } from 'react';
import { ProofKeyboardGuide } from './ProofKeyboardGuide';
import { ProofRuleHelp } from './ProofRuleHelp';
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
  return (
    <div className="proof-help">
      <ProofKeyboardGuide />
      <details onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>Rule reference ({rules.length} enabled)</summary>
        {open && (
          <>
            {!rules.length && <p>No inference rules are enabled.</p>}
            {rules.map((rule) => (
              <ProofRuleHelp key={rule.id} format={format} rules={rules} ruleId={rule.id} />
            ))}
          </>
        )}
      </details>
    </div>
  );
}
