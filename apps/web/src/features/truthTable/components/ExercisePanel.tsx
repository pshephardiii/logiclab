import type { TruthTableExerciseResponse } from '@logiclab/schema';
import type { Answers } from '../types';
import { TruthTable } from './TruthTable';

type Props = {
  exercise: TruthTableExerciseResponse | null;
  formula: string;
  answers: Answers;
  loading: boolean;
  completed: number;
  total: number;
  onAnswer: (rowId: string, columnId: string, value: boolean | null) => void;
};

export function ExercisePanel({ exercise, formula, answers, loading, completed, total, onAnswer }: Props) {
  return (
    <section className="panel" aria-labelledby="exercise-heading" aria-busy={loading}>
      <div className="exercise-heading">
        <h2 id="exercise-heading">Your truth table</h2>
        {exercise && <span className="progress">{completed} / {total} cells filled</span>}
      </div>
      <p role="status" className="help">{loading ? 'Creating your exercise…' : exercise ? 'Table ready. Given values are fixed; choose T or F for each answer.' : 'Enter a formula above and select Create table to start.'}</p>
      {exercise && <TruthTable exercise={exercise} formula={formula} answers={answers} onAnswer={onAnswer} />}
    </section>
  );
}
