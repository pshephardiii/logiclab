import { useState } from 'react';
import { useAssignedAttempt } from '../hooks/useAssignedAttempt';
import { AssignedItemTable } from '../../../features/assignment/components/AssignedItemTable';
import { SubmissionSummary } from '../../../features/assignment/components/SubmissionSummary';

/** Explicit item saves precede the irreversible final-submission confirmation. */
export function AssignedAttempt({ assignmentId }: { assignmentId: string }) {
  const work = useAssignedAttempt(assignmentId);
  const [position, setPosition] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  if (work.loading) return <p role="status">Loading assigned work…</p>;
  if (!work.assignment)
    return (
      <section className="panel">
        <p role="alert" className="error">
          {work.error}
        </p>
        <button onClick={() => void work.load()}>Retry assigned work</button>
      </section>
    );
  const item = work.assignment.items[position] ?? work.assignment.items[0];
  const submitted = Boolean(work.attempt?.submittedAt);
  const busy = work.action !== null;
  function reload() {
    setConfirmed(false);
    setPosition(0);
    void work.load();
  }
  function changeItem(index: number) {
    setPosition(index);
    setConfirmed(false);
  }
  return (
    <>
      <section className="panel">
        <h2>{work.assignment.title}</h2>
        {work.assignment.instructions && <p>{work.assignment.instructions}</p>}
        <p>
          {submitted
            ? 'Final answers are read-only.'
            : 'Use Save problem to persist changes. Feedback arrives after final submission.'}
        </p>
        <button className="secondary" disabled={busy} onClick={reload}>
          Reload saved work (discard unsaved edits)
        </button>
        {work.error && (
          <p role="alert" className="error">
            {work.error}
          </p>
        )}
        {work.notice && <p role="status">{work.notice}</p>}
        {work.dirty.length > 0 && (
          <p role="status">Unsaved changes in {work.dirty.length} problem(s).</p>
        )}
      </section>
      {work.attempt?.submittedAt && work.attempt.result && (
        <SubmissionSummary result={work.attempt.result} submittedAt={work.attempt.submittedAt} />
      )}
      {item && (
        <>
          <section className="panel">
            <label htmlFor="assigned-item">Problem</label>
            <select
              className="assignment-choice"
              id="assigned-item"
              value={item.id}
              disabled={busy}
              onChange={(event) =>
                changeItem(
                  work.assignment!.items.findIndex((value) => value.id === event.target.value),
                )
              }
            >
              {work.assignment.items.map((value, index) => (
                <option key={value.id} value={value.id}>
                  {index + 1}. {value.title}
                </option>
              ))}
            </select>
            <div className="action-row">
              <button
                className="secondary"
                disabled={busy || position === 0}
                onClick={() => changeItem(position - 1)}
              >
                Previous problem
              </button>
              <button
                className="secondary"
                disabled={busy || position >= work.assignment.items.length - 1}
                onClick={() => changeItem(position + 1)}
              >
                Next problem
              </button>
            </div>
          </section>
          <AssignedItemTable
            item={item}
            answers={work.answers[item.id] ?? {}}
            feedback={
              submitted
                ? (work.attempt?.result?.items.find((value) => value.itemId === item.id)
                    ?.feedback ?? null)
                : null
            }
            solution={work.solutions[item.id] ?? null}
            readOnly={busy || submitted}
            onAnswer={(row, column, value) => {
              setConfirmed(false);
              work.changeAnswer(item.id, row, column, value);
            }}
          />
          {!submitted && (
            <button
              disabled={busy || !work.dirty.includes(item.id)}
              onClick={() => {
                setConfirmed(false);
                void work.save(item.id);
              }}
            >
              {work.action === 'save' ? 'Saving problem…' : 'Save problem'}
            </button>
          )}
          {submitted && work.assignment.allowSolutions && (
            <button disabled={busy} onClick={() => void work.toggleSolution(item.id)}>
              {work.solutions[item.id] ? 'Hide assigned solution' : 'Show assigned solution'}
            </button>
          )}
        </>
      )}
      {!submitted && (
        <section className="panel">
          <h2>Final submission</h2>
          <p>
            Save all edited problems first. Blank cells count as unanswered. You may submit only
            once.
          </p>
          <label className="final-confirmation">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy || work.dirty.length > 0}
              onChange={(event) => setConfirmed(event.target.checked)}
            />{' '}
            I understand submission is final and cannot be edited.
          </label>
          <button
            disabled={busy || !confirmed || work.dirty.length > 0}
            onClick={() => void work.submit()}
          >
            {work.action === 'submit' ? 'Submitting…' : 'Submit final answers'}
          </button>
        </section>
      )}
    </>
  );
}
