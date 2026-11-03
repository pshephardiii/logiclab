import { AssignmentPolicyFields } from './AssignmentPolicyFields';
import {
  ASSIGNMENT_POINT_LIMITS,
  assignmentLearningPolicySchema,
  createAssignmentRequestSchema,
} from '@logiclab/contracts';
import { useEffect, useState, type FormEvent } from 'react';
import type { AssignmentDetail, CreateAssignmentRequest } from '@logiclab/contracts';
import type { LibraryProblemVersion } from '@logiclab/contracts/problem-library';
import { PublishedProblemPicker } from './PublishedProblemPicker';
import { AssignmentItems } from './AssignmentItems';
import {
  assignmentFormDefaults,
  assignmentFormState,
  type SelectedProblem,
} from '../helpers/assignment-form-state';
import { AssignmentPointsSummary } from './AssignmentPointsSummary';

type Props = {
  assignment: AssignmentDetail | null;
  busy: boolean;
  onDirty: (value: boolean) => void;
  onSave: (input: CreateAssignmentRequest, itemsChanged: boolean) => Promise<boolean>;
};

/** Retains unsaved input after failed writes; published/archived content is read-only. */
export function AssignmentForm({ assignment, busy, onDirty, onSave }: Props) {
  const defaults = assignmentFormDefaults(assignment);
  const [title, setTitle] = useState(defaults.title);
  const [instructions, setInstructions] = useState(defaults.instructions);
  const [policy, setPolicy] = useState(() => assignmentLearningPolicySchema.parse(defaults.policy));
  const [gradeReleaseTiming, setGradeReleaseTiming] = useState(defaults.gradeReleaseTiming);
  const [items, setItems] = useState<SelectedProblem[]>(defaults.items);
  const readOnly = Boolean(assignment?.publishedAt || assignment?.archivedAt);
  const ids = items.map((item) => item.version.id);
  const graded = policy.assessmentMode === 'graded';
  const {
    itemsChanged,
    invalidPoints,
    totalPoints,
    containsProof,
    allowsProofs,
    invalidProofMode,
    dirty,
  } = assignmentFormState(assignment, { title, instructions, policy, gradeReleaseTiming, items });
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);

  function add(version: LibraryProblemVersion) {
    if (version.definition.type === 'derivation' && !allowsProofs) return;
    setItems((previous) =>
      previous.length >= 50 ? previous : [...previous, { key: crypto.randomUUID(), version }],
    );
  }
  function move(index: number, direction: -1 | 1) {
    setItems((previous) => {
      const result = [...previous];
      const target = index + direction;
      if (target < 0 || target >= result.length) return previous;
      [result[index], result[target]] = [result[target]!, result[index]!];
      return result;
    });
  }
  function remove(index: number) {
    setItems((previous) => previous.filter((_, position) => position !== index));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalidPoints || invalidProofMode || busy || readOnly) return;
    await onSave(
      createAssignmentRequestSchema.parse({
        title,
        instructions: instructions || null,
        ...(policy.assessmentMode === 'graded'
          ? {
              items: items.map((item) => ({
                problemVersionId: item.version.id,
                maxPoints: item.maxPoints ?? ASSIGNMENT_POINT_LIMITS.defaultPoints,
              })),
            }
          : { problemVersionIds: ids }),
        ...policy,
        gradeReleaseTiming,
      }),
      itemsChanged,
    );
  }
  return (
    <section className="panel assignment-editor" aria-label="Assignment editor">
      <h2>
        {assignment
          ? readOnly
            ? 'Saved assignment'
            : 'Edit assignment draft'
          : 'Create an assignment'}
      </h2>
      <form onSubmit={(event) => void submit(event)}>
        <fieldset disabled={busy || readOnly}>
          <label htmlFor="assignment-title">Assignment title</label>
          <input
            id="assignment-title"
            required
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <label htmlFor="assignment-instructions">Assignment instructions</label>
          <textarea
            id="assignment-instructions"
            maxLength={5000}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
          />
          <AssignmentPolicyFields
            policy={policy}
            containsProof={containsProof}
            onChange={setPolicy}
            gradeReleaseTiming={gradeReleaseTiming}
            onGradeReleaseChange={setGradeReleaseTiming}
          />
          {containsProof && (
            <p className="help">
              Verified graded proofs receive full points; other proofs need instructor grading.
              Practice proofs have no official score or final submission.
            </p>
          )}
          <AssignmentItems
            items={items}
            graded={graded}
            readOnly={readOnly}
            onPoints={(index, maxPoints) =>
              setItems((previous) =>
                previous.map((item, position) =>
                  position === index ? { ...item, maxPoints } : item,
                ),
              )
            }
            onMove={move}
            onRemove={remove}
          />
          {graded && (
            <AssignmentPointsSummary invalidPoints={invalidPoints} totalPoints={totalPoints} />
          )}
          {!readOnly && (
            <PublishedProblemPicker
              disabled={busy || items.length >= 50}
              allowDerivations={allowsProofs}
              onAdd={add}
            />
          )}
          {!readOnly && (
            <button type="submit" disabled={invalidPoints || invalidProofMode}>
              {busy ? 'Saving…' : 'Save assignment draft'}
            </button>
          )}
        </fieldset>
      </form>
      {readOnly && (
        <p className="help">
          {assignment?.publishedAt
            ? 'Published content and policy are locked. Restoring an archived publication does not unlock it.'
            : 'Restore this archived draft to continue editing.'}
        </p>
      )}
    </section>
  );
}
