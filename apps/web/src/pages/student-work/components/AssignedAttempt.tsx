import { AssignedConceptualQuestion } from '../../../features/assignment/components/AssignedConceptualQuestion';
import { useUnsavedWork } from '../../../features/unsaved-work/hooks/useUnsavedWork';
import { useConfirmDiscard } from '../../../features/unsaved-work/hooks/useConfirmDiscard';
import {
  submissionFeedback,
  conceptualSubmissionFeedback,
} from '../../../features/assignment/helpers/submission-feedback';
import { useState } from 'react';
import { useAssignedAttempt } from '../hooks/useAssignedAttempt';
import { AssignedItemTable } from '../../../features/assignment/components/AssignedItemTable';
import { SubmissionSummary } from '../../../features/assignment/components/SubmissionSummary';

/** Explicit item saves precede the irreversible final-submission confirmation. */
export function AssignedAttempt({ assignmentId }: { assignmentId: string }) {
  const work = useAssignedAttempt(assignmentId);
  useUnsavedWork(work.dirty.length > 0 && !work.attempt?.submittedAt);
  const confirmDiscard = useConfirmDiscard();
  const [position, setPosition] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  if (work.loading) return <p role="status">Loading assigned work…</p>;
  if (!work.assignment)
    return (
      <section className="panel">
        <p role="alert" className="error">
          {work.error}
        </p>
        <button onClick={() => confirmDiscard(() => void work.load())}>Retry assigned work</button>
      </section>
    );
  const item = work.assignment.items[position] ?? work.assignment.items[0];
  const currentFeedback = item ? work.feedback[item.id] : undefined;
  const currentSolution = item ? work.solutions[item.id] : undefined;
  const submitted = Boolean(work.attempt?.submittedAt);
  const busy = work.action !== null;
  const submissionBlocked =
    busy || work.dirty.length > 0 || (work.requiresCompleteAnswers && !work.completionReady);
  function reload() {
    confirmDiscard(() => {
      setConfirmed(false);
      setPosition(0);
      void work.load();
    });
  }
  function changeItem(index: number) {
    work.cancelCheck();
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
            : work.allowsImmediateFeedback
              ? 'Incorrect entries are highlighted shortly after you stop editing. Check answers is also available. Use Save problem to persist changes.'
              : work.allowsExplicitCheck
                ? 'Use Save problem to persist changes. Check answers evaluates your current entries without saving them.'
                : work.assignment.assessmentMode === 'graded' &&
                    work.assignment.gradeReleaseTiming === 'instructor_release'
                  ? 'Use Save problem to persist changes. Your grade will be available after submission when your instructor releases grades.'
                  : 'Use Save problem to persist changes. Results arrive after final submission.'}
        </p>
        {!work.hasFinalSubmission && (
          <p>
            Ungraded practice: no final submission or official score. Your practice answers stay
            private.
          </p>
        )}
        <button className="secondary" disabled={busy} onClick={reload}>
          {submitted
            ? 'Refresh results and answer access'
            : 'Reload saved work (discard unsaved edits)'}
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
      {work.attempt?.gradePending && (
        <section className="panel" role="status">
          <h2>Submitted — awaiting grade release</h2>
          <p>
            Your final answers were received. Your instructor has not released your grade yet.
            Refresh results to check again.
          </p>
        </section>
      )}
      {work.assignment.solutionAccess === 'instructor_release' &&
        !work.assignment.answersRevealedAt && (
          <p className="help">
            Correct answers are hidden until your instructor reveals them. Answer reveal is separate
            from grade release.
          </p>
        )}
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
          {'exercise' in item ? (
            <AssignedItemTable
              item={item}
              answers={work.answers[item.id] ?? {}}
              feedback={
                submitted
                  ? submissionFeedback(work.attempt?.result, item.id)
                  : currentFeedback && 'cells' in currentFeedback
                    ? currentFeedback
                    : null
              }
              solution={currentSolution && 'rows' in currentSolution ? currentSolution : null}
              neutralBlanks={!submitted && work.allowsImmediateFeedback}
              readOnly={busy || submitted}
              onAnswer={(row, column, value) => {
                setConfirmed(false);
                work.changeAnswer(item.id, row, column, value);
              }}
            />
          ) : (
            <AssignedConceptualQuestion
              item={item}
              answer={work.choiceAnswers[item.id]}
              feedback={
                submitted
                  ? conceptualSubmissionFeedback(work.attempt?.result, item.id)
                  : currentFeedback && 'status' in currentFeedback
                    ? currentFeedback
                    : null
              }
              solution={currentSolution && 'type' in currentSolution ? currentSolution : null}
              neutralBlanks={!submitted && work.allowsImmediateFeedback}
              readOnly={busy || submitted}
              onAnswer={(answer) => {
                setConfirmed(false);
                work.changeConceptualAnswer(item.id, answer);
              }}
            />
          )}
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
          {!submitted && work.allowsExplicitCheck && (
            <button
              disabled={busy || work.checkingItem !== null}
              onClick={() => void work.check(item.id)}
            >
              {work.checkingItem === item.id ? 'Checking answers…' : 'Check answers'}
            </button>
          )}
          {work.solutionAvailable && (
            <button disabled={busy} onClick={() => void work.toggleSolution(item.id)}>
              {work.solutions[item.id] ? 'Hide assigned solution' : 'Show assigned solution'}
            </button>
          )}
        </>
      )}
      {!submitted && work.hasFinalSubmission && (
        <section className="panel">
          <h2>Final submission</h2>
          <p>
            {work.requiresCompleteAnswers
              ? 'Fill every answer cell and select an answer for every question, then save all edits before submitting. Correctness does not affect completion; no correctness score is recorded.'
              : 'Save all edited problems first. Blank cells count as unanswered. You may submit only once.'}
          </p>
          <label className="final-confirmation">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={submissionBlocked}
              onChange={(event) => setConfirmed(event.target.checked)}
            />{' '}
            I understand submission is final and cannot be edited.
          </label>
          <button disabled={submissionBlocked || !confirmed} onClick={() => void work.submit()}>
            {work.action === 'submit' ? 'Submitting…' : 'Submit final answers'}
          </button>
        </section>
      )}
    </>
  );
}
