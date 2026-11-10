import { useEffect, useId, useRef, useState } from 'react';
import { ProofRuleReference } from './ProofRuleHelp';
import type { ProofHelpFormat } from './RuleExample';
import './permitted-rules-dialog.css';

function RulesDialog({
  rules,
  format,
  onClose,
}: {
  rules: { id: string; label: string }[];
  format: ProofHelpFormat;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const select = useId();
  const [chosen, setChosen] = useState(rules[0]?.id ?? '');
  const selected = rules.some((rule) => rule.id === chosen) ? chosen : (rules[0]?.id ?? '');
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="permitted-rules-dialog"
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id={title}>Permitted rules</h2>
      {rules.length ? (
        <>
          <label htmlFor={select}>Rule</label>
          <select id={select} value={selected} onChange={(event) => setChosen(event.target.value)}>
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.label}
              </option>
            ))}
          </select>
          <ProofRuleReference ruleId={selected} rules={rules} format={format} />
        </>
      ) : (
        <p>No inference rules enabled.</p>
      )}
      <button type="button" className="secondary" onClick={onClose}>
        Close rules
      </button>
    </dialog>
  );
}

/** Read-only rule reference for immutable publication views; never changes permissions or labels. */
export function PermittedRulesButton({
  rules,
  format,
}: {
  rules: { id: string; label: string }[];
  format: ProofHelpFormat;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="text-button" onClick={() => setOpen(true)}>
        View permitted rules ({rules.length})
      </button>
      {open && <RulesDialog rules={rules} format={format} onClose={() => setOpen(false)} />}
    </>
  );
}
