import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PROOF_LIMITS } from '@logiclab/contracts';
import { parseProofFormula } from '@logiclab/logic-engine/proof';
import { ProofFormulaInput } from '../../../features/proof/components/ProofFormulaInput';

/** Only independent practice owns an editable target; applying it never rewrites the proof. */
export function PracticeConclusionEditor({
  conclusion,
  onApply,
  onEditingChange,
}: {
  conclusion: string;
  onApply: (conclusion: string) => void;
  onEditingChange: (editing: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conclusion);
  const [error, setError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    onEditingChange(editing);
    return () => onEditingChange(false);
  }, [editing, onEditingChange]);

  useEffect(() => {
    if (editing) form.current?.querySelector('input')?.focus();
    else if (restoreFocus.current) {
      trigger.current?.focus();
      restoreFocus.current = false;
    }
  }, [editing]);

  function close() {
    restoreFocus.current = true;
    setEditing(false);
    setError(null);
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = draft.trim();
    try {
      if (!next) throw new Error('Enter a conclusion.');
      if (next.length > PROOF_LIMITS.maxFormulaLength)
        throw new Error(`Use at most ${PROOF_LIMITS.maxFormulaLength} characters.`);
      parseProofFormula(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enter a well-formed conclusion.');
      form.current?.querySelector('input')?.focus();
      return;
    }
    onApply(next);
    close();
  }

  return editing ? (
    <form
      ref={form}
      className="practice-conclusion-editor"
      aria-label="Edit practice conclusion"
      onSubmit={apply}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
      }}
    >
      <ProofFormulaInput
        aria-label="New conclusion"
        value={draft}
        onValueChange={(value) => {
          setDraft(value);
          setError(null);
        }}
        maxLength={PROOF_LIMITS.maxFormulaLength}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'practice-conclusion-error' : undefined}
      />
      <div className="action-row">
        <button type="submit">Apply conclusion</button>
        <button type="button" className="secondary" onClick={close}>
          Cancel
        </button>
      </div>
      {error && (
        <p id="practice-conclusion-error" className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  ) : (
    <button
      ref={trigger}
      type="button"
      className="text-button"
      onClick={() => {
        setDraft(conclusion);
        setError(null);
        setEditing(true);
      }}
    >
      Edit conclusion
    </button>
  );
}
