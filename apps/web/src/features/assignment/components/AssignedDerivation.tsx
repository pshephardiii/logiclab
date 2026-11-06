import type { ProofCheckReport } from '@logiclab/contracts';
import type {
  SavedDerivationAnswer as DerivationAnswer,
  SavedDerivationSolution as DerivationSolution,
} from '@logiclab/contracts/saved-student-work';
import { DependencyProofEditor } from '../../proof/dependency/DependencyProofEditor';
import { TreeProofEditor } from '../../proof/tree/TreeProofEditor';
import { ProofSummary } from '../../proof/components/ProofSummary';
import type { SavedStudentAssignment } from '@logiclab/contracts/saved-student-work';
import { FitchProofEditor } from '../../proof/components/FitchProofEditor';
import { ProofFeedback } from '../../proof/components/ProofFeedback';
import '../assignment.css';

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
    proof &&
    proof.format === item.content.format &&
    feedback &&
    JSON.stringify(proof) === JSON.stringify(feedback.proof)
      ? feedback.report
      : null;

  return (
    <section className="panel assigned-item proof-editor">
      <h2>
        Problem {item.position}: {item.title}
      </h2>
      {item.instructions && <p>{item.instructions}</p>}
      <p>
        <strong>Format:</strong>{' '}
        {item.content.format === 'tree'
          ? 'Natural-deduction tree'
          : item.content.format === 'fitch'
            ? 'Fitch'
            : 'Dependency'}
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
          label="Your submitted proof"
        />
      ) : (
        <>
          <p className="help">
            Use Save problem to persist your proof. Incomplete formulas and unfinished steps can be
            saved.
            {onCheck && ' Check proof evaluates your current work without saving it.'}
          </p>
          <fieldset disabled={disabled} aria-label="Edit proof">
            {item.content.format === 'tree' ? (
              <TreeProofEditor
                statement={item.content}
                proof={proof?.format === 'tree' ? proof : null}
                purpose="student"
                onChange={(next) => {
                  if (!readOnly && !disabled)
                    onAnswer({
                      type: 'derivation',
                      proof: next ?? { proofVersion: 1, format: 'tree', rootId: null, nodes: [] },
                    });
                }}
              />
            ) : item.content.format === 'dependency' ? (
              <DependencyProofEditor
                statement={item.content}
                proof={proof?.format === 'dependency' ? proof : null}
                purpose="student"
                onChange={(next) => {
                  if (!readOnly && !disabled)
                    onAnswer({
                      type: 'derivation',
                      proof: next ?? { proofVersion: 1, format: 'dependency', steps: [] },
                    });
                }}
              />
            ) : (
              <FitchProofEditor
                statement={item.content}
                proof={proof?.format === 'fitch' ? proof : null}
                purpose="student"
                onChange={(next) => {
                  if (!readOnly && !disabled)
                    onAnswer({
                      type: 'derivation',
                      proof: next ?? { proofVersion: 1, format: 'fitch', steps: [], blocks: [] },
                    });
                }}
              />
            )}
            {onCheck && (
              <button type="button" disabled={checking || disabled} onClick={onCheck}>
                {checking ? 'Checking proof…' : 'Check proof'}
              </button>
            )}
          </fieldset>
        </>
      )}
      {report && (
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
