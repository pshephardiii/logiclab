import type {
  TruthTableExerciseResponse,
  TruthTableCheckResponse,
  TruthTableSolutionResponse,
} from '@logiclab/contracts';
import type { Answers } from '../types';
import type { Ref } from 'react';
import { TruthTable } from './TruthTable';

type Props = {
  panelRef?: Ref<HTMLElement>;
  feedback: TruthTableCheckResponse | null;
  solution: TruthTableSolutionResponse | null;
  action: 'check' | 'solution' | null;
  actionError: string | null;
  onCheck: () => Promise<void>;
  onToggleSolution: () => void;
  exercise: TruthTableExerciseResponse | null;
  formula: string;
  answers: Answers;
  loading: boolean;
  completed: number;
  total: number;
  onAnswer: (rowId: string, columnId: string, value: boolean | null) => void;
};

/**
 * Presents exercise progress, check/solution controls, request feedback, and the truth table.
 */
export function ExercisePanel({
  panelRef,
  exercise,
  formula,
  answers,
  loading,
  completed,
  total,
  onAnswer,
  feedback,
  solution,
  action,
  actionError,
  onCheck,
  onToggleSolution,
}: Props) {
  const statusMessage = loading ? (
    'Creating your exercise…'
  ) : exercise ? (
    'Table ready. Given values are fixed; choose T or F for each answer.'
  ) : (
    <>
      Enter a formula above and select <strong>“Create table”</strong> to start.
    </>
  );
  const solutionLabel =
    action === 'solution' ? 'Loading solution…' : solution ? 'Hide solution' : 'Show solution';

  return (
    <section
      ref={panelRef}
      className="panel"
      aria-labelledby="exercise-heading"
      aria-busy={loading || action !== null}
    >
      <div className="exercise-heading">
        <h2 id="exercise-heading">Your truth table</h2>
        {exercise && (
          <span className="progress">
            {completed} / {total} cells filled
          </span>
        )}
      </div>
      <p role="status" className="help">
        {statusMessage}
      </p>
      {exercise && (
        <div className="action-row">
          <button disabled={action !== null} onClick={() => void onCheck()}>
            {action === 'check' ? 'Checking…' : 'Check answers'}
          </button>
          <button className="secondary" disabled={action !== null} onClick={onToggleSolution}>
            {solutionLabel}
          </button>
        </div>
      )}
      {feedback && (
        <p role="status" className="feedback-summary">
          {feedback.summary.correct} correct · {feedback.summary.incorrect} incorrect ·{' '}
          {feedback.summary.unanswered} unanswered
        </p>
      )}
      {solution && (
        <p role="status" className="help">
          Solution shown alongside your answers. Your entries are preserved.
        </p>
      )}
      {actionError && (
        <p role="alert" className="error">
          {actionError}
        </p>
      )}
      {exercise && (
        <TruthTable
          feedback={feedback}
          solution={solution}
          exercise={exercise}
          formula={formula}
          answers={answers}
          onAnswer={onAnswer}
        />
      )}
    </section>
  );
}
