import { useTruthTablePractice } from './useTruthTablePractice';
import { FormulaForm } from './components/FormulaForm';
import { ExercisePanel } from './components/ExercisePanel';

export function TruthTablePractice() {
  const practice = useTruthTablePractice();
  return (
    <main>
      <header>
        <p className="eyebrow">LogicLab / Independent practice</p>
        <h1>Work through the logic.</h1>
        <p className="intro">Build a truth table, then fill in the intermediate and final expressions with T or F.</p>
      </header>
      <FormulaForm formula={practice.formula} loading={practice.loading} error={practice.error}
        inputRef={practice.inputRef} onFormulaChange={practice.changeFormula} onCreate={practice.createTable} />
      <ExercisePanel exercise={practice.exercise} formula={practice.formula} answers={practice.answers}
        loading={practice.loading} completed={practice.completed} total={practice.total} onAnswer={practice.changeAnswer} />
      <p className="footnote">Independent practice · Work stays in this page and is cleared on reload.</p>
    </main>
  );
}
