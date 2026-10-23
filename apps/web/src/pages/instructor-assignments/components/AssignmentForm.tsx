import { AssignmentPolicyFields } from './AssignmentPolicyFields';
import { assignmentLearningPolicySchema, createAssignmentRequestSchema } from '@logiclab/contracts';
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
  const [items, setItems] = useState<SelectedProblem[]>(
    assignment?.items.map((item) => ({ key: item.id, version: item.problemVersion })) ?? [],
  );
  const readOnly = Boolean(assignment?.publishedAt || assignment?.archivedAt);
  const ids = items.map((item) => item.version.id);
  const itemsChanged =
    JSON.stringify(ids) !==
    JSON.stringify(assignment?.items.map((item) => item.problemVersion.id) ?? []);
  const dirty =
    title !== (assignment?.title ?? '') ||
    instructions !== (assignment?.instructions ?? '') ||
    policy.assessmentMode !== originalPolicy.assessmentMode ||
    policy.feedbackTiming !== originalPolicy.feedbackTiming ||
    policy.solutionAccess !== originalPolicy.solutionAccess ||
    itemsChanged;
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
    await onSave(
      createAssignmentRequestSchema.parse({
        title,
        instructions: instructions || null,
        problemVersionIds: ids,
        ...policy,
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
          <AssignmentPolicyFields policy={policy} onChange={setPolicy} />
          <AssignmentItems items={items} readOnly={readOnly} onMove={move} onRemove={remove} />
          {!readOnly && (
            <PublishedProblemPicker disabled={busy || items.length >= 50} onAdd={add} />
          )}
          {!readOnly && <button type="submit">{busy ? 'Saving…' : 'Save assignment draft'}</button>}
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
