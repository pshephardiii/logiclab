import type { FitchProof, ProofCheckReport } from '@logiclab/contracts';
import type { DerivationAnswer } from '@logiclab/contracts/derivation-work';
import type { DerivationSolution } from '@logiclab/contracts/derivation';
import type { SavedStudentAssignment } from '@logiclab/contracts/saved-student-work';
import { FitchProofEditor } from '../../proof/components/FitchProofEditor';
import { FitchProofSummary } from '../../proof/components/FitchProofSummary';
import { ProofFeedback } from '../../proof/components/ProofFeedback';
import '../assignment.css';

type Props = {
  item: Extract<SavedStudentAssignment['items'][number], { content: { type: 'derivation' } }>;
  answer?: DerivationAnswer;
  /** The caller must capture the checked proof and enforce checking/result-release permissions. */
  feedback?: { proof: FitchProof; report: ProofCheckReport } | null;
  /** Only supply after independently authorized answer reveal. */
  solution?: DerivationSolution | null;
  readOnly: boolean;
  checking?: boolean;
  disabled?: boolean;
  onAnswer: (answer: DerivationAnswer) => void;
  /** Omit when checking is not permitted; editing never invokes it automatically. */
  onCheck?: () => void;
};

/** Staged student panel. Neither private definitions nor a local checker belong in this view. */
export function AssignedDerivation({
  item,
  answer,
  feedback,
  solution,
  readOnly,
  checking = false,
  disabled = false,
  onAnswer,
  onCheck,
}: Props) {
  const proof = answer?.proof ?? null;
  const report =
    proof && feedback && JSON.stringify(proof) === JSON.stringify(feedback.proof)
      ? feedback.report
      : null;
  return (
    <section className="panel assigned-item fitch-proof">
      <h2>
        Problem {item.position}: {item.title}
      </h2>
      {item.instructions && <p>{item.instructions}</p>}
      <p>
        <strong>Format:</strong> Fitch
      </p>
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
      {readOnly ? (
        <FitchProofSummary proof={proof} rules={item.content.rules} label="Your submitted proof" />
      ) : (
        <>
          <p className="help">
            Use Save problem to persist your proof. Incomplete formulas and unfinished steps can be
            saved.
            {onCheck && ' Check proof evaluates your current work without saving it.'}
          </p>
          <fieldset disabled={disabled} aria-label="Edit proof">
            <FitchProofEditor
              statement={item.content}
              proof={proof}
              purpose="student"
              onChange={(next) => {
                if (!readOnly && !disabled)
                  onAnswer({
                    type: 'derivation',
                    proof: next ?? { proofVersion: 1, format: 'fitch', steps: [], blocks: [] },
                  });
              }}
            />
            {onCheck && (
              <button type="button" disabled={checking || disabled} onClick={onCheck}>
                {checking ? 'Checking proof…' : 'Check proof'}
              </button>
            )}
          </fieldset>
        </>
      )}
      {report && <ProofFeedback report={report} />}
      {solution && (
        <div className="conceptual-solution">
          <h3>Instructor solution</h3>
          <FitchProofSummary
            proof={solution.referenceProof}
            rules={item.content.rules}
            label="Instructor reference proof"
          />
          {solution.explanation && <p>{solution.explanation}</p>}
        </div>
      )}
    </section>
  );
}
