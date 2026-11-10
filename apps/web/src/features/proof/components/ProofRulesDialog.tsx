import './proof-rules-dialog.css';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { PROPOSITIONAL_RULE_CATALOG } from '@logiclab/logic-engine/proof/rules';

const coreGroups = [
  { label: 'Reiteration', ids: ['reiteration'] },
  { label: 'Conjunction', ids: ['and_introduction', 'and_elimination'] },
  { label: 'Disjunction', ids: ['or_introduction', 'or_elimination'] },
  { label: 'Implication', ids: ['implication_introduction', 'implication_elimination'] },
  {
    label: 'Negation and contradiction',
    ids: ['negation_introduction', 'contradiction_introduction', 'contradiction_elimination'],
  },
  { label: 'Biconditional', ids: ['biconditional_introduction', 'biconditional_elimination'] },
];
const categories = [
  { id: 'derived', label: 'Derived rules' },
  { id: 'classical', label: 'Classical rules' },
] as const;

/** Settings apply immediately, including when Escape closes the dialog. */
export function ProofRulesDialog({
  selected,
  onChange,
  onClose,
  renderDetails,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
  renderDetails?: (rule: (typeof PROPOSITIONAL_RULE_CATALOG)[number]) => ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  function ruleChoice(rule: (typeof PROPOSITIONAL_RULE_CATALOG)[number]) {
    return (
      <div key={rule.id}>
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

  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement;
    element.showModal();
    heading.current?.focus();
    return () => {
      element.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="proof-rule-dialog"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (
          event.key === 'Enter' &&
          event.target instanceof HTMLInputElement &&
          event.target.type !== 'checkbox'
        )
          event.preventDefault();
      }}
      onClickCapture={(event) => {
        if (event.detail <= 1) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <div>
          <h2 ref={heading} id={titleId} tabIndex={-1}>
            Permitted rules
          </h2>
          <span>{selected.length} selected</span>
        </div>
        <button
          type="button"
          className="text-button"
          aria-label="Close permitted rules"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="proof-rule-options">
        <div className="proof-rule-bulk">
          <button
            type="button"
            className="text-button"
            onClick={() => onChange(PROPOSITIONAL_RULE_CATALOG.map((rule) => rule.id))}
          >
            Select all
          </button>
          <button type="button" className="text-button" onClick={() => onChange([])}>
            Clear selection
          </button>
        </div>
        <fieldset className="proof-rule-core">
          <legend>Core rules</legend>
          <div className="proof-rule-categories">
            {coreGroups.map((group) => (
              <fieldset className="proof-rule-category" key={group.label}>
                <legend>{group.label}</legend>
                {PROPOSITIONAL_RULE_CATALOG.filter((rule) => group.ids.includes(rule.id)).map(
                  ruleChoice,
                )}
              </fieldset>
            ))}
          </div>
        </fieldset>
        <div className="proof-rule-categories proof-rule-extra">
          {categories.map((category) => (
            <fieldset className="proof-rule-category" key={category.id}>
              <legend>{category.label}</legend>
              {PROPOSITIONAL_RULE_CATALOG.filter((rule) => rule.category === category.id).map(
                ruleChoice,
              )}
            </fieldset>
          ))}
        </div>
      </div>
      <footer>
        <button type="button" onClick={onClose}>
          Done
        </button>
      </footer>
    </dialog>
  );
}
