import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { CreateProblemRequest, ProblemDraft } from '@logiclab/contracts';

type Props = {
  problem: ProblemDraft | null;
  busy: boolean;
  saveError?: string | null;
  onSave: (input: CreateProblemRequest) => Promise<boolean>;
  onPreview: (formula: string) => void;
  onDirty: (dirty: boolean) => void;
};
/** Keeps unsaved fields locally, including after failed saves; archived drafts are read-only. */
export function ProblemForm({
  problem,
  busy,
  saveError = null,
  onSave,
  onPreview,
  onDirty,
}: Props) {
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (saveError) errorRef.current?.focus();
  }, [saveError]);
  const [title, setTitle] = useState(problem?.title ?? '');
  const [instructions, setInstructions] = useState(problem?.instructions ?? '');
  const [formula, setFormula] = useState(problem?.definition.formula ?? '');
  useEffect(() => {
    onDirty(
      title !== (problem?.title ?? '') ||
        instructions !== (problem?.instructions ?? '') ||
        formula !== (problem?.definition.formula ?? ''),
    );
  }, [title, instructions, formula, problem, onDirty]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({
      title,
      instructions: instructions || null,
      definition: { type: 'truth_table', definitionVersion: 1, formula },
    });
  }
  return (
    <section className="panel">
      <h2>{problem ? 'Edit draft' : 'Create a problem'}</h2>
      {saveError && (
        <p ref={errorRef} id="problem-save-error" className="error" role="alert" tabIndex={-1}>
          {saveError}
        </p>
      )}
      <form
        aria-describedby={saveError ? 'problem-save-error' : undefined}
        className="problem-editor"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <fieldset disabled={busy || Boolean(problem?.archivedAt)}>
          <label htmlFor="problem-title">Title</label>
          <input
            id="problem-title"
            required
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <label htmlFor="problem-instructions">Instructions</label>
          <textarea
            id="problem-instructions"
            maxLength={5000}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
          />
          <label htmlFor="problem-formula">Formula</label>
          <input
            id="problem-formula"
            required
            maxLength={256}
            value={formula}
            onChange={(event) => setFormula(event.target.value)}
          />
          <button type="submit">{busy ? 'Saving…' : 'Save draft'}</button>
        </fieldset>
      </form>
      <button
        className="secondary"
        disabled={busy || !formula.trim()}
        onClick={() => onPreview(formula)}
      >
        Preview draft
      </button>
      <p className="help">Save edits before publishing. Publishing uses the saved draft.</p>
    </section>
  );
}
