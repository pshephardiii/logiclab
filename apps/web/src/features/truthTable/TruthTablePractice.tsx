import { DiscardChangesDialog } from '../unsaved-work/components/DiscardChangesDialog';
import { TableSampleWalkthrough } from '../practice/components/TableSampleWalkthrough';
import { TableSampleControl } from './components/TableSampleControl';
import './truth-table.css';
import { useEffect, useRef, useState } from 'react';
import { usePracticeContext } from './PracticeProvider';
import { FormulaForm } from './components/FormulaForm';
import { ExercisePanel } from './components/ExercisePanel';

/**
 * Composes formula entry and exercise controls using navigation-persistent practice state.
 */
export function TruthTablePractice() {
  const practice = usePracticeContext();
  const [exitingSample, setExitingSample] = useState(false);
  const focusSetup = useRef(false);
  const sampleInvitationRef = useRef<HTMLDivElement>(null);
  const tablePanelRef = useRef<HTMLElement>(null);
  const previousExercise = useRef(practice.exercise);

  useEffect(() => {
    const created = practice.exercise !== null && practice.exercise !== previousExercise.current;

    previousExercise.current = practice.exercise;

    // Returning to a retained table or checking answers should not move the page.
    if (!created) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const target = sampleInvitationRef.current ?? tablePanelRef.current;
    target?.scrollIntoView({
      behavior: reducedMotion ? 'instant' : 'smooth',
      block: 'start',
    });
  }, [practice.exercise]);

  useEffect(() => {
    if (!focusSetup.current || practice.sampleActive) return;
    focusSetup.current = false;
    practice.inputRef.current?.focus();
  }, [practice.sampleActive, practice.inputRef]);

  function exitSample() {
    setExitingSample(true);
  }

  function confirmExit() {
    setExitingSample(false);
    focusSetup.current = true;
    practice.resetPractice();
  }

  return (
    <>
      <header>
        <p className="eyebrow">LogicLab / Independent practice</p>
        <h1>Work through the logic.</h1>
        <p className="intro">
          Build a truth table, then fill in the intermediate and final expressions with T or F.
        </p>
      </header>
      <TableSampleControl
        hasWork={practice.hasWorkToReplace}
        onCreateOwn={practice.sampleActive && !practice.exercise ? exitSample : undefined}
        onLoad={(formula) => void practice.loadSample(formula)}
      />
      <FormulaForm
        formula={practice.formula}
        loading={practice.loading}
        error={practice.error}
        inputRef={practice.inputRef}
        onFormulaChange={practice.changeFormula}
        onCreate={practice.createTable}
      />
      {practice.sampleActive && practice.exercise && (
        <div ref={sampleInvitationRef}>
          <TableSampleWalkthrough key={practice.sampleGeneration} onExitSample={exitSample} />
        </div>
      )}
      <ExercisePanel
        sample={practice.sampleActive}
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
      {exitingSample && (
        <DiscardChangesDialog onStay={() => setExitingSample(false)} onDiscard={confirmExit} />
      )}
      <p className="footnote">
        Independent practice · Work stays in this page and is cleared on reload.
      </p>
    </>
  );
}
