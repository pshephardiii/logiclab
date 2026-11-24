import { ProblemType } from '@logiclab/contracts/problem-type';
import { useCallback, useState } from 'react';
import type { SavedStudentAssignment } from '@logiclab/contracts/saved-student-work';
import type {
  TruthTreeAnswer,
  TruthTreeVerdictAssessment,
} from '@logiclab/contracts/truth-tree-work';
import type { TruthTreeSolution } from '@logiclab/contracts/truth-tree-authoring';
import type { TruthTreeCheckReport } from '@logiclab/contracts/truth-tree';
import { TruthTreeSummary } from '../../truth-tree/components/TruthTreeSummary';
import { TruthTreeFeedback } from '../../truth-tree/components/TruthTreeFeedback';
import { TruthTreeEditor } from '../../truth-tree/components/TruthTreeEditor';
import { TruthTreeDisplay } from '../../truth-tree/components/TruthTreeDisplay';
import { TruthTreeVerdict } from '../../truth-tree/components/TruthTreeVerdict';
import { TruthTreeSolutionView } from '../../truth-tree/components/TruthTreeSolutionView';
import { initialTruthTree } from '../../truth-tree/helpers/construction';
import { ProofKeyboardGuide } from '../../proof/reference/ProofKeyboardGuide';
import { ProofDeletionPrompt } from '../../proof/components/ProofDeletionPrompt';

type Props = {
  item: Extract<
    SavedStudentAssignment['items'][number],
    { content: { type: typeof ProblemType.TruthTree } }
  >;
  answer?: TruthTreeAnswer;
  /** Already-authorized retained results or the latest server check; never a local assigned-work check. */
  report?: TruthTreeCheckReport | null;
  verdictAssessment?: TruthTreeVerdictAssessment | null;
  solution?: TruthTreeSolution | null;
  readOnly?: boolean;
  disabled?: boolean;
  checking?: boolean;
  onAnswer?: (answer: TruthTreeAnswer) => void;
  onCheck?: () => void;
  onPendingChange?: (pending: boolean) => void;
};

/** Pinned statement and explicit saves belong to the caller; reference reveal stays independent. */
export function AssignedTruthTree({
  item,
  answer,
  solution,
  report,
  verdictAssessment,
  readOnly = true,
  disabled = false,
  checking = false,
  onAnswer,
  onCheck,
  onPendingChange,
}: Props) {
  const [pending, setPending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changePending = useCallback(
    (value: boolean) => {
      setPending(value);
      onPendingChange?.(value);
    },
    [onPendingChange],
  );

  function start() {
    if (readOnly || disabled || !onAnswer) return;
    try {
      onAnswer({
        type: ProblemType.TruthTree,
        tree: initialTruthTree(item.content),
        verdict: null,
      });
      setError(null);
      setResetting(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not start the tree.');
      setResetting(false);
    }
  }

  return (
    <section
      className="panel assigned-item assigned-truth-tree proof-editor"
      aria-label="Assigned truth tree"
    >
      <h2>
        Problem {item.position}: {item.title}
      </h2>
      {item.instructions && <p>{item.instructions}</p>}
      <TruthTreeSummary definition={item.content} />
      {!readOnly && <ProofKeyboardGuide />}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {answer ? (
        readOnly ? (
          <TruthTreeDisplay tree={answer.tree} statement={item.content} />
        ) : (
          <TruthTreeEditor
            statement={item.content}
            tree={answer.tree}
            disabled={disabled}
            onPendingChange={changePending}
            onChange={(tree) => onAnswer?.({ ...answer, tree })}
          />
        )
      ) : (
        <p>No saved tree.</p>
      )}
      {answer && (
        <TruthTreeVerdict
          value={answer.verdict}
          readOnly={readOnly}
          disabled={disabled || pending}
          onChange={(verdict) => onAnswer?.({ ...answer, verdict })}
        />
      )}
      {!readOnly && (
        <>
          <button
            type="button"
            className="secondary"
            disabled={disabled || pending}
            onClick={() => (answer ? setResetting(true) : start())}
          >
            {answer ? 'Start tree over' : 'Start tree'}
          </button>
          {onCheck && (
            <button
              type="button"
              disabled={disabled || checking || pending || !answer}
              onClick={() => !pending && onCheck()}
            >
              {checking ? 'Checking tree…' : 'Check tree'}
            </button>
          )}
        </>
      )}
      {report && !pending && (
        <TruthTreeFeedback
          tree={answer?.tree}
          report={report}
          verdict={verdictAssessment}
          showArgument={Boolean(verdictAssessment?.answer)}
        />
      )}
      {solution && <TruthTreeSolutionView solution={solution} statement={item.content} />}
      {resetting && (
        <ProofDeletionPrompt
          modal
          label="Start this tree over?"
          onCancel={() => setResetting(false)}
        >
          <p>
            Replace this problem's tree with its starting premises and negated conclusion. Save
            problem to keep the replacement. The validity verdict will also be cleared.
          </p>
          <button type="button" disabled={disabled} onClick={start}>
            Replace tree
          </button>
          <button type="button" className="secondary" onClick={() => setResetting(false)}>
            Keep tree
          </button>
        </ProofDeletionPrompt>
      )}
    </section>
  );
}
