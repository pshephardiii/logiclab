import { AssignmentPolicyFields } from './AssignmentPolicyFields';
import {
  ASSIGNMENT_POINT_LIMITS,
  assignmentLearningPolicySchema,
  assignmentItemPointsSchema,
  createAssignmentRequestSchema,
} from '@logiclab/contracts';
import { useEffect, useState, type FormEvent } from 'react';
import type {
  AssignmentDetail,
  CreateAssignmentRequest,
  PublishedProblemVersion,
} from '@logiclab/contracts';
import { PublishedProblemPicker } from './PublishedProblemPicker';
import { AssignmentItems, type SelectedProblem } from './AssignmentItems';

type Props = {
  assignment: AssignmentDetail | null;
  busy: boolean;
  onDirty: (value: boolean) => void;
  onSave: (input: CreateAssignmentRequest, itemsChanged: boolean) => Promise<boolean>;
};

/** Retains unsaved input after failed writes; published/archived content is read-only. */
export function AssignmentForm({ assignment, busy, onDirty, onSave }: Props) {
  const [title, setTitle] = useState(assignment?.title ?? '');
  const [instructions, setInstructions] = useState(assignment?.instructions ?? '');
  const originalPolicy = {
    assessmentMode: assignment?.assessmentMode ?? 'graded',
    feedbackTiming: assignment?.feedbackTiming ?? 'on_submission',
    solutionAccess: assignment?.solutionAccess ?? 'never',
  };
  const [policy, setPolicy] = useState(() => assignmentLearningPolicySchema.parse(originalPolicy));
  const [gradeReleaseTiming, setGradeReleaseTiming] = useState(
    assignment?.gradeReleaseTiming ?? 'on_submission',
  );
  const [items, setItems] = useState<SelectedProblem[]>(
    assignment?.items.map((item) => ({
      key: item.id,
      version: item.problemVersion,
      maxPoints: item.maxPoints ?? ASSIGNMENT_POINT_LIMITS.defaultPoints,
    })) ?? [],
  );
  const readOnly = Boolean(assignment?.publishedAt || assignment?.archivedAt);
  const ids = items.map((item) => item.version.id);
  const itemsChanged =
    JSON.stringify(items.map((item) => item.key)) !==
    JSON.stringify(assignment?.items.map((item) => item.id) ?? []);
  const graded = policy.assessmentMode === 'graded';
  const invalidPoints =
    graded &&
    items.some(
      (item) =>
        !assignmentItemPointsSchema.safeParse(
          item.maxPoints ?? ASSIGNMENT_POINT_LIMITS.defaultPoints,
        ).success,
    );
  const pointsChanged =
    graded &&
    items.some(
      (item, index) =>
        (item.maxPoints ?? ASSIGNMENT_POINT_LIMITS.defaultPoints) !==
        (assignment?.items[index]?.maxPoints ?? ASSIGNMENT_POINT_LIMITS.defaultPoints),
    );
  const dirty =
    title !== (assignment?.title ?? '') ||
    instructions !== (assignment?.instructions ?? '') ||
    policy.assessmentMode !== originalPolicy.assessmentMode ||
    policy.feedbackTiming !== originalPolicy.feedbackTiming ||
    policy.solutionAccess !== originalPolicy.solutionAccess ||
    gradeReleaseTiming !== (assignment?.gradeReleaseTiming ?? 'on_submission') ||
    itemsChanged ||
    pointsChanged;
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);

  function add(version: PublishedProblemVersion) {
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
    if (invalidPoints || busy || readOnly) return;
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
            onChange={setPolicy}
            gradeReleaseTiming={gradeReleaseTiming}
            onGradeReleaseChange={setGradeReleaseTiming}
          />
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
            <>
              <p className="help">
                Each problem has its own weight. Use whole points from 1 to 1,000. Published
                allocations are locked.
              </p>
              {invalidPoints ? (
                <p role="alert">Enter whole points from 1 to 1,000 for every problem.</p>
              ) : (
                <p>
                  Total available:{' '}
                  {items.reduce(
                    (sum, item) => sum + (item.maxPoints ?? ASSIGNMENT_POINT_LIMITS.defaultPoints),
                    0,
                  )}{' '}
                  points.
                </p>
              )}
            </>
          )}
          {!readOnly && (
            <PublishedProblemPicker disabled={busy || items.length >= 50} onAdd={add} />
          )}
          {!readOnly && (
            <button type="submit" disabled={invalidPoints}>
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
