import './truth-table.css';
import { useEffect, useRef } from 'react';
import { usePracticeContext } from './PracticeProvider';
import { FormulaForm } from './components/FormulaForm';
import { ExercisePanel } from './components/ExercisePanel';

/**
 * Composes formula entry and exercise controls using navigation-persistent practice state.
 */
export function TruthTablePractice() {
  const practice = usePracticeContext();
  const tablePanelRef = useRef<HTMLElement>(null);
  const previousExercise = useRef(practice.exercise);

  useEffect(() => {
    const created = practice.exercise !== null && practice.exercise !== previousExercise.current;
    previousExercise.current = practice.exercise;
    // Returning to a retained table or checking answers should not move the page.
    if (!created) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    tablePanelRef.current?.scrollIntoView({
      behavior: reducedMotion ? 'instant' : 'smooth',
      block: 'start',
    });
  }, [practice.exercise]);

  return (
    <>
      <header>
        <p className="eyebrow">LogicLab / Independent practice</p>
        <h1>Work through the logic.</h1>
        <p className="intro">
          Build a truth table, then fill in the intermediate and final expressions with T or F.
        </p>
      </header>
      <FormulaForm
        formula={practice.formula}
        loading={practice.loading}
        error={practice.error}
        inputRef={practice.inputRef}
        onFormulaChange={practice.changeFormula}
        onCreate={practice.createTable}
      />
      <ExercisePanel
        panelRef={tablePanelRef}
        exercise={practice.exercise}
        formula={practice.formula}
        answers={practice.answers}
        feedback={practice.feedback}
        solution={practice.solution}
        action={practice.action}
        actionError={practice.actionError}
        onCheck={practice.check}
        onToggleSolution={practice.toggleSolution}
        loading={practice.loading}
        completed={practice.completed}
        total={practice.total}
        onAnswer={practice.changeAnswer}
      />
      <p className="footnote">
        Independent practice · Work stays in this page and is cleared on reload.
      </p>
    </>
  );
}
