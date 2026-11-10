import { referenceStatementError } from '../helpers/reference-statement';
import { ProblemMetadataFields } from './ProblemMetadataFields';
import { startDependencyProof } from '../../../features/proof/dependency/editor';
import './dependency-authoring.css';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  createLibraryProblemRequestSchema,
  type CreateLibraryProblemRequest,
  type LibraryProblemDefinition,
  type LibraryProblemDraft,
} from '@logiclab/contracts/problem-library';
import { DerivationProblemFields } from './DerivationProblemFields';
import {
  initialProblemFields,
  editorDefinition,
  editorSnapshot,
  type ProblemEditorFields,
  type DependencyAuthoringStep,
} from '../helpers/problem-editor';
import { ConceptualProblemFields } from './ConceptualProblemFields';

type Props = {
  problem: LibraryProblemDraft | null;
  busy: boolean;
  saveError?: string | null;
  onSave: (input: CreateLibraryProblemRequest) => Promise<boolean>;
  onPreview: (definition: LibraryProblemDefinition) => void;
  onDirty: (dirty: boolean) => void;
  initialDependencyStep?: DependencyAuthoringStep;
  onDependencyStepChange?: (step: DependencyAuthoringStep) => void;
};

/** Keeps each draft local through failures and type changes; archived records remain read-only. */
export function ProblemForm({
  problem,
  busy,
  saveError = null,
  onSave,
  onPreview,
  onDirty,
  initialDependencyStep = 'details',
  onDependencyStepChange,
}: Props) {
  const [initial] = useState(() => initialProblemFields(problem));
  const [fields, setFields] = useState(initial);
  const [entryPending, setEntryPending] = useState(false);
  const [premisePending, setPremisePending] = useState(false);
  const workPending = entryPending || premisePending;
  const [dependencyStep, setDependencyStep] = useState(initialDependencyStep);
  const dependency = fields.type === 'derivation' && fields.derivation.format === 'dependency';
  const referenceStep = dependency && dependencyStep === 'reference';
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const focusStep = useRef(false);

  const [validationError, setValidationError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const error = validationError ?? saveError;

  useEffect(() => {
    if (!focusStep.current) return;
    stepHeading.current?.focus();
    stepHeading.current?.scrollIntoView?.({ block: 'start' });
    focusStep.current = false;
  }, [referenceStep]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    onDirty(workPending || editorSnapshot(fields) !== editorSnapshot(initial));
  }, [fields, initial, onDirty, workPending]);

  function change(next: ProblemEditorFields) {
    setFields(next);
    setValidationError(null);
  }

  function goToStep(step: DependencyAuthoringStep) {
    if (!dependency || busy || workPending || step === dependencyStep) return;

    if (step === 'reference') {
      const error = referenceStatementError(fields.derivation);

      if (error) {
        setValidationError(error);
        return;
      }
    }

    // Entering reference construction is explicit and local. Seed premises once, retaining
    // any existing reference identities when navigating back from statement edits.
    if (step === 'reference' && !fields.derivation.referenceProof && !problem?.archivedAt) {
      change({
        ...fields,
        derivation: {
          ...fields.derivation,
          format: 'dependency',
          referenceProof: startDependencyProof(fields.derivation.premises),
        },
      });
    }

    focusStep.current = true;
    setDependencyStep(step);
    onDependencyStepChange?.(step);
  }

  function validatedDefinition() {
    if (premisePending) {
      setValidationError('Add premise or Discard premise before saving or previewing.');
      return null;
    }
    if (entryPending) {
      setValidationError('Add line or Discard entry before saving or previewing.');
      return null;
    }

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

    const input = createLibraryProblemRequestSchema.safeParse({
      title: fields.title,
      instructions: fields.instructions || null,
      definition,
    });

    if (!input.success) {
      setValidationError(
        input.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' '),
      );
      return;
    }

    await onSave(input.data);
  }

  return (
    <section className="panel">
      <h2 ref={stepHeading} tabIndex={-1}>
        {referenceStep
          ? fields.title || 'Untitled problem'
          : problem
            ? 'Edit draft'
            : 'Create a problem'}
      </h2>
      {dependency && (
        <nav aria-label="Dependency authoring steps" className="dependency-authoring-steps">
          <button
            type="button"
            className="secondary"
            aria-current={!referenceStep ? 'step' : undefined}
            disabled={busy || workPending}
            onClick={() => goToStep('details')}
          >
            1. Problem details
          </button>
          <button
            type="button"
            className="secondary"
            aria-current={referenceStep ? 'step' : undefined}
            disabled={busy || workPending}
            onClick={() => goToStep('reference')}
          >
            2. Reference proof
          </button>
        </nav>
      )}
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
          <div hidden={referenceStep}>
            <ProblemMetadataFields
              fields={fields}
              onChange={change}
              typeDisabled={workPending}
              titleRequired={!referenceStep}
            />
          </div>
          {/* Show only the selected type's fields; other local draft fields survive type changes. */}
          {fields.type === 'derivation' ? (
            <DerivationProblemFields
              fields={fields}
              dependencyStep={dependencyStep}
              onChange={change}
              entryPending={workPending}
              onPendingChange={setEntryPending}
              onPremisePendingChange={setPremisePending}
            />
          ) : fields.type === 'truth_table' ? (
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
          {dependency && !referenceStep && (
            <button
              type="button"
              className="dependency-reference-next"
              disabled={workPending}
              onClick={() => goToStep('reference')}
            >
              Continue to reference proof
            </button>
          )}
          <button type="submit" disabled={workPending}>
            {busy ? 'Saving…' : 'Save draft'}
          </button>
        </fieldset>
      </form>
      <button
        hidden={referenceStep}
        className="secondary"
        disabled={
          busy ||
          workPending ||
          (fields.type === 'derivation'
            ? false
            : fields.type === 'truth_table'
              ? !fields.formula.trim()
              : !fields.question.trim())
        }
        onClick={() => {
          const definition = validatedDefinition();

          if (definition) onPreview(definition);
        }}
      >
        Preview draft
      </button>
      <p className="help">
        {referenceStep
          ? 'Save your draft, then return to Problem details to publish.'
          : 'Save edits before publishing. Publishing uses the saved draft.'}
      </p>
    </section>
  );
}
