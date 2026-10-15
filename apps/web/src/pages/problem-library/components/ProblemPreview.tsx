import { useEffect } from 'react';
import { useTruthTablePractice } from '../../../features/truthTable/hooks/useTruthTablePractice';
import { ExercisePanel } from '../../../features/truthTable/components/ExercisePanel';
import '../../../features/truthTable/truth-table.css';

/** Independent preview state never replaces the visitor's practice-page answers. */
export function ProblemPreview({ formula }: { formula: string }) {
  const practice = useTruthTablePractice(formula);
  // The parent remounts each preview; generate once for its fixed formula.
  useEffect(() => {
    void practice.createTable();
  }, []);
  return (
    <section aria-label="Problem preview">
      <h2>Preview: {formula}</h2>
      {practice.error && (
        <p role="alert" className="error">
          {practice.error}
        </p>
      )}
      {practice.error && <button onClick={() => void practice.createTable()}>Retry preview</button>}
      <ExercisePanel
        {...practice}
        onCheck={practice.check}
        onToggleSolution={practice.toggleSolution}
        onAnswer={practice.changeAnswer}
      />
    </section>
  );
}
