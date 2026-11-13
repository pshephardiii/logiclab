import { AssignedDerivationEditor } from './AssignedDerivationEditor';
import { ProofHelp } from '../../proof/reference/ProofHelp';
import { proofNotation } from '../../proof/helpers/proof-notation';
import { isProofFormatAvailable } from '@logiclab/contracts';
import type { ProofCheckReport } from '@logiclab/contracts';
import type {
  SavedDerivationAnswer as DerivationAnswer,
  SavedDerivationSolution as DerivationSolution,
} from '@logiclab/contracts/saved-student-work';
import { ProofSummary } from '../../proof/components/ProofSummary';
import type { SavedStudentAssignment } from '@logiclab/contracts/saved-student-work';
import { ProofFeedback } from '../../proof/components/ProofFeedback';
import '../assignment.css';
import { useCallback, useState } from 'react';

type Props = {
  item: Extract<SavedStudentAssignment['items'][number], { content: { type: 'derivation' } }>;
  answer?: DerivationAnswer;
  /** The caller must capture the checked proof and enforce checking/result-release permissions. */
  feedback?: { proof: DerivationAnswer['proof']; report: ProofCheckReport } | null;
  /** Only supply after independently authorized answer reveal. */
  solution?: DerivationSolution | null;
  readOnly: boolean;
  checking?: boolean;
  disabled?: boolean;
  onAnswer: (answer: DerivationAnswer) => void;
  /** Omit when checking is not permitted; editing never invokes it automatically. */
  onCheck?: () => void;
  onPendingChange?: (pending: boolean) => void;
};

/** Staged student panel. Neither private definitions nor a local checker belong in this view. */
export function AssignedDerivation({
  item,
  answer,
  feedback,
  solution,
  readOnly: requestedReadOnly,
  checking = false,
  disabled = false,
  onAnswer,
  onCheck,
  onPendingChange,
}: Props) {
  const unavailable = !isProofFormatAvailable(item.content.format);
  const readOnly = requestedReadOnly || unavailable;
  const proof = answer?.proof ?? null;
  const [entryPending, setEntryPending] = useState(false);
  const changePending = useCallback(
    (pending: boolean) => {
      setEntryPending(pending);
      onPendingChange?.(pending);
    },
    [onPendingChange],
  );

  const report =
    proof &&
    proof.format === item.content.format &&
    feedback &&
    JSON.stringify(proof) === JSON.stringify(feedback.proof)
      ? feedback.report
      : null;
  const dependency = item.content.format === 'dependency';
  const visualReadOnly = readOnly && (dependency || item.content.format === 'tree');
  const showStatement =
    !dependency && !visualReadOnly && (readOnly || !proof || proof.format !== item.content.format);

  return (
    <section className="panel assigned-item proof-editor">
      <h2>
        Problem {item.position}: {item.title}
      </h2>
      {item.instructions && <p>{item.instructions}</p>}
      {unavailable && (
        <p className="help">
          Natural-deduction tree proofs are unavailable for new work. Retained work is shown
          read-only.
        </p>
      )}
      <p>
        <strong>Format:</strong>{' '}
        {item.content.format === 'tree'
          ? 'Natural-deduction tree'
          : item.content.format === 'fitch'
            ? 'Fitch'
            : 'Dependency'}
      </p>
      {visualReadOnly && (
        <>
          {item.content.premises.length > 0 && (
            <section aria-label="Problem premises">
              <h3>Premises</h3>
              <ol>
                {item.content.premises.map((premise) => (
                  <li key={premise.id}>
                    <code>{proofNotation(premise.formula)}</code>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <p className="proof-goal" aria-label="Proof conclusion">
            <span>Conclusion</span>
            <code>{proofNotation(item.content.conclusion)}</code>
          </p>
          <ProofHelp format={item.content.format} rules={item.content.rules} />
        </>
      )}
      {showStatement && (
        <>
          <h3>Premises</h3>
          {item.content.premises.length ? (
            <ol>
              {item.content.premises.map((premise) => (
                <li key={premise.id}>
                  <code>{premise.formula}</code>
                </li>
              ))}
            </ol>
          ) : (
            <p>No premises.</p>
          )}
          <p>
            <strong>Conclusion:</strong> <code>{item.content.conclusion}</code>
          </p>
          <h3>Permitted rules</h3>
          {item.content.rules.length ? (
            <ul>
              {item.content.rules.map((rule) => (
                <li key={rule.id}>{rule.label}</li>
              ))}
            </ul>
          ) : (
            <p>No rules enabled.</p>
          )}
        </>
      )}
      {/* Reject mismatched saved work before choosing read-only review or the pinned-format editor. */}
      {proof && proof.format !== item.content.format ? (
        <p role="alert" className="error">
          The saved proof format does not match this problem. Reload saved work before editing.
        </p>
      ) : readOnly ? (
        <ProofSummary
          proof={proof}
          format={item.content.format}
          rules={item.content.rules}
          label={unavailable ? 'Your retained proof' : 'Your submitted proof'}
        />
      ) : (
        <>
          {!dependency && (
            <p className="help">
              Use Save problem to persist your proof. Incomplete formulas and unfinished steps can
              be saved.
              {onCheck && ' Check proof evaluates your current work without saving it.'}
            </p>
          )}
          <fieldset disabled={disabled} aria-label="Edit proof">
            <AssignedDerivationEditor
              statement={item.content}
              proof={proof}
              readOnly={readOnly}
              disabled={disabled}
              onAnswer={onAnswer}
              onPendingChange={changePending}
            />
            {onCheck && (
              <div className={dependency ? 'proof-check-actions' : undefined}>
                <button
                  type="button"
                  disabled={checking || disabled || entryPending}
                  onClick={() => !entryPending && onCheck()}
                >
                  {checking ? 'Checking proof…' : 'Check proof'}
                </button>
              </div>
            )}
          </fieldset>
        </>
      )}
      {report && !entryPending && (
        <ProofFeedback
          report={report}
          stepLabel={item.content.format === 'tree' ? 'Node' : 'Line'}
        />
      )}
      {/* Reference reveal is independent of the student's proof and its check report. */}
      {solution && solution.format === item.content.format && (
        <div className="conceptual-solution">
          <h3>Instructor solution</h3>
          <ProofSummary
            proof={solution.referenceProof}
            format={solution.format}
            rules={item.content.rules}
            label="Instructor reference proof"
          />
          {solution.explanation && <p>{solution.explanation}</p>}
        </div>
      )}
    </section>
  );
}
