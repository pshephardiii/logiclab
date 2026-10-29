import type {
  StudentAssignment,
  TruthTableCheckResponse,
  TruthTableSolutionResponse,
} from '@logiclab/contracts';
import type { Answers } from '../../truthTable/types';
import { TruthTable } from '../../truthTable/components/TruthTable';
import '../../truthTable/truth-table.css';
import '../assignment.css';

type Props = {
  item: StudentAssignment['items'][number];
  answers: Answers;
  feedback: TruthTableCheckResponse | null;
  solution?: TruthTableSolutionResponse | null;
  neutralBlanks?: boolean;
  readOnly: boolean;
  onAnswer: (row: string, column: string, value: boolean | null) => void;
};

/** Shared assigned-work/review table; policy and persistence remain with the caller. */
export function AssignedItemTable({
  item,
  answers,
  feedback,
  solution = null,
  neutralBlanks = false,
  readOnly,
  onAnswer,
}: Props) {
  // Assignment acceptance stays guarded until the conceptual controls land.
  if (!('exercise' in item))
    return (
      <section className="panel">
        <h2>
          Problem {item.position}: {item.title}
        </h2>
        <p>{item.content.question}</p>
        <p>Conceptual answer controls are not available in this build yet.</p>
      </section>
    );
  const visibleFeedback =
    feedback && neutralBlanks
      ? { ...feedback, cells: feedback.cells.filter((cell) => cell.status !== 'unanswered') }
      : feedback;
  return (
    <section className="panel assigned-item">
      <h2>
        Problem {item.position}: {item.title}
      </h2>
      {item.instructions && <p>{item.instructions}</p>}
      <p>
        Formula: <code>{item.formula}</code>
      </p>
      <fieldset disabled={readOnly} aria-label="Truth-table answers">
        <TruthTable
          exercise={item.exercise}
          formula={item.formula}
          answers={answers}
          feedback={visibleFeedback}
          solution={solution}
          onAnswer={onAnswer}
        />
      </fieldset>
      {feedback && (
        <p role="status">
          {feedback.summary.correct} correct · {feedback.summary.incorrect} incorrect ·{' '}
          {feedback.summary.unanswered} unanswered
        </p>
      )}
    </section>
  );
}
