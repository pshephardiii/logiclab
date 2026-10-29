import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  createProblemRequestSchema,
  type CreateProblemRequest,
  type ProblemDefinition,
  type ProblemDraft,
} from '@logiclab/contracts';
import {
  initialProblemFields,
  editorDefinition,
  editorSnapshot,
  type ProblemEditorFields,
} from '../helpers/problem-editor';
import { ConceptualProblemFields } from './ConceptualProblemFields';

type Props = {
  problem: ProblemDraft | null;
  busy: boolean;
  saveError?: string | null;
  onSave: (input: CreateProblemRequest) => Promise<boolean>;
  onPreview: (definition: ProblemDefinition) => void;
  onDirty: (dirty: boolean) => void;
};

/** Keeps each draft local through failures and type changes; archived records remain read-only. */
export function ProblemForm({
  problem,
  busy,
  saveError = null,
  onSave,
  onPreview,
  onDirty,
}: Props) {
  const [initial] = useState(() => initialProblemFields(problem));
  const [fields, setFields] = useState(initial);
  const [validationError, setValidationError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const error = validationError ?? saveError;
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    onDirty(editorSnapshot(fields) !== editorSnapshot(initial));
  }, [fields, initial, onDirty]);
  function change(next: ProblemEditorFields) {
    setFields(next);
    setValidationError(null);
  }
  function validatedDefinition() {
    const parsed = editorDefinition(fields);
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .slice(0, 3)
          .join(' '),
      );
      return null;
    }
    setValidationError(null);
    return parsed.data;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const definition = validatedDefinition();
    if (!definition) return;
    const input = createProblemRequestSchema.safeParse({
      title: fields.title,
      instructions: fields.instructions || null,
      definition,
    });
    if (!input.success) {
      setValidationError(input.error.issues.map((issue) => issue.message).join(' '));
      return;
    }
    await onSave(input.data);
  }
  return (
    <section className="panel">
      <h2>{problem ? 'Edit draft' : 'Create a problem'}</h2>
      {error && (
        <p ref={errorRef} id="problem-save-error" className="error" role="alert" tabIndex={-1}>
          {error}
        </p>
      )}
      <form
        aria-describedby={error ? 'problem-save-error' : undefined}
        className="problem-editor"
        onSubmit={(event) => void submit(event)}
      >
        <fieldset disabled={busy || Boolean(problem?.archivedAt)}>
          <label htmlFor="problem-title">Title</label>
          <input
            id="problem-title"
            required
            maxLength={120}
            value={fields.title}
            onChange={(event) => change({ ...fields, title: event.target.value })}
          />
          <label htmlFor="problem-instructions">Instructions</label>
          <textarea
            id="problem-instructions"
            maxLength={5000}
            value={fields.instructions}
            onChange={(event) => change({ ...fields, instructions: event.target.value })}
          />
          <label htmlFor="problem-type">Problem type</label>
          <select
            id="problem-type"
            value={fields.type}
            onChange={(event) =>
              change({ ...fields, type: event.target.value as ProblemDefinition['type'] })
            }
          >
            <option value="truth_table">Truth table</option>
            <option value="true_false">True/false</option>
            <option value="multiple_choice">Multiple choice</option>
          </select>
          <p className="help">
            Only the selected problem type is saved. Switching types keeps your fields until you
            leave this editor.
          </p>
          {fields.type === 'truth_table' ? (
            <>
              <label htmlFor="problem-formula">Formula</label>
              <input
                id="problem-formula"
                required
                maxLength={256}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={fields.formula}
                onChange={(event) => change({ ...fields, formula: event.target.value })}
              />
            </>
          ) : (
            <ConceptualProblemFields fields={fields} onChange={change} />
          )}
          <button type="submit">{busy ? 'Saving…' : 'Save draft'}</button>
        </fieldset>
      </form>
      <button
        className="secondary"
        disabled={
          busy || (fields.type === 'truth_table' ? !fields.formula.trim() : !fields.question.trim())
        }
        onClick={() => {
          const definition = validatedDefinition();
          if (definition) onPreview(definition);
        }}
      >
        Preview draft
      </button>
      <p className="help">Save edits before publishing. Publishing uses the saved draft.</p>
    </section>
  );
}
