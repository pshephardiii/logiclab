import { FinalSubmissionPanel } from './FinalSubmissionPanel';
import { AssignedProblemNavigation } from './AssignedProblemNavigation';
import { AssignedDerivation } from '../../../features/assignment/components/AssignedDerivation';
import { blankDerivationAnswer } from '../../../features/assignment/helpers/proof-answers';
import { AssignedConceptualQuestion } from '../../../features/assignment/components/AssignedConceptualQuestion';
import { useUnsavedWork } from '../../../features/unsaved-work/hooks/useUnsavedWork';
import { useConfirmDiscard } from '../../../features/unsaved-work/hooks/useConfirmDiscard';
import {
  truthTableSubmissionFeedback,
  conceptualSubmissionFeedback,
  proofSubmissionFeedback,
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
  const isProof = item && 'content' in item && item.content.type === 'derivation';
  const currentFeedback = item ? work.feedback[item.id] : undefined;
  const currentSolution = item ? work.solutions[item.id] : undefined;
  const submitted = Boolean(work.attempt?.submittedAt);
  const proofAnswer = item ? work.proofAnswers[item.id] : undefined;
  const proofReport = item ? proofSubmissionFeedback(work.attempt?.result, item.id) : null;

  const proofFeedback = submitted
    ? proofReport
      ? {
          proof: (
            proofAnswer ??
            blankDerivationAnswer(
              item && 'content' in item && item.content.type === 'derivation'
                ? item.content.format
                : 'fitch',
            )
          ).proof,
          report: proofReport,
        }
      : null
    : item
      ? work.proofFeedback[item.id]
      : null;

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
        {work.assignment.assessmentMode === 'graded' &&
          work.assignment.items.every((value) => value.maxPoints != null) && (
            <p>
              Total available:{' '}
              {work.assignment.items.reduce((sum, value) => sum + value.maxPoints!, 0)} points.
            </p>
          )}
        <p>
          {submitted
            ? 'Final answers are read-only.'
            : work.allowsImmediateFeedback
              ? 'Truth-table and question entries are checked shortly after you stop editing. Check answers is also available. Use Save problem to persist changes.'
              : work.allowsExplicitCheck
                ? 'Use Save problem to persist changes. Check answers evaluates your current entries without saving them.'
                : work.assignment.assessmentMode === 'graded' &&
                    work.assignment.gradeReleaseTiming === 'instructor_release'
                  ? 'Use Save problem to persist changes. Your grade will be available after submission when your instructor releases grades.'
                  : 'Use Save problem to persist changes. Results arrive after final submission.'}
        </p>
        {work.assignment.items.some(
          (value) => 'content' in value && value.content.type === 'derivation',
        ) && (
          <p>
            {work.assignment.assessmentMode === 'ungraded_practice'
              ? 'Proofs are checked only when you choose Check proof. Editing never checks a proof automatically.'
              : work.assignment.assessmentMode === 'graded'
                ? 'Save your proof attempt before submitting. Verified proofs earn full points; other proofs need instructor grading. Proof diagnostics follow grade release.'
                : 'Finish and save your proof attempt before submitting. Proof diagnostics appear after submission; logical mistakes do not remove completion credit.'}
          </p>
        )}
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
      {/* A submission receipt can be visible while graded reports and points remain withheld. */}
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
        <SubmissionSummary
          result={work.attempt.result}
          submittedAt={work.attempt.submittedAt}
          score={work.attempt.score}
          automaticScore={work.attempt.automaticScore}
          instructorGrading={work.attempt.instructorGrading}
          items={work.assignment.items}
        />
      )}
      {item && (
        <>
          <AssignedProblemNavigation
            items={work.assignment.items}
            selectedId={item.id}
            position={position}
            busy={busy}
            maxPoints={work.assignment.assessmentMode === 'graded' ? item.maxPoints : undefined}
            onSelect={changeItem}
          />
          {/* Each problem type uses its own editor; submitted work uses retained final feedback. */}
          {'exercise' in item ? (
            <AssignedItemTable
              item={item}
              answers={work.answers[item.id] ?? {}}
              feedback={
                submitted
                  ? truthTableSubmissionFeedback(work.attempt?.result, item.id)
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
          ) : item.content.type === 'derivation' ? (
            <AssignedDerivation
              key={item.id}
              item={{ ...item, content: item.content }}
              answer={
                proofAnswer ??
                (submitted
                  ? blankDerivationAnswer(
                      item && 'content' in item && item.content.type === 'derivation'
                        ? item.content.format
                        : 'fitch',
                    )
                  : undefined)
              }
              feedback={proofFeedback}
              solution={
                currentSolution &&
                'type' in currentSolution &&
                currentSolution.type === 'derivation'
                  ? currentSolution
                  : null
              }
              readOnly={submitted}
              disabled={busy}
              checking={work.checkingItem === item.id}
              onAnswer={(answer) => {
                setConfirmed(false);
                work.changeProofAnswer(item.id, answer);
              }}
              onCheck={
                !submitted &&
                work.assignment.assessmentMode === 'ungraded_practice' &&
                work.allowsExplicitCheck
                  ? () => void work.check(item.id)
                  : undefined
              }
            />
          ) : (
            <AssignedConceptualQuestion
              item={{ ...item, content: item.content }}
              answer={work.choiceAnswers[item.id]}
              feedback={
                submitted
                  ? conceptualSubmissionFeedback(work.attempt?.result, item.id)
                  : currentFeedback && 'status' in currentFeedback
                    ? currentFeedback
                    : null
              }
              solution={
                currentSolution &&
                'type' in currentSolution &&
                currentSolution.type !== 'derivation'
                  ? currentSolution
                  : null
              }
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
          {!submitted && !isProof && work.allowsExplicitCheck && (
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
        <FinalSubmissionPanel
          requiresCompleteAnswers={work.requiresCompleteAnswers}
          confirmed={confirmed}
          blocked={submissionBlocked}
          submitting={work.action === 'submit'}
          onConfirmChange={setConfirmed}
          onSubmit={() => void work.submit()}
        />
      )}
    </>
  );
}
