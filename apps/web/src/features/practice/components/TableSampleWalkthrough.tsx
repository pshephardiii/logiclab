import { useMemo } from 'react';
import { cellKey, type Answers } from '../../truthTable/types';
import { TruthTable } from '../../truthTable/components/TruthTable';
import { createTruthTableSample } from '../samples/truth-table';
import { SampleExample } from './SampleExample';

/** Reveal public example columns; visitor inputs and API solution state remain independent. */
export function TableSampleWalkthrough() {
  const sample = useMemo(createTruthTableSample, []);
  const exercise = {
    variables: [...sample.completed.variables],
    columns: [...sample.completed.columns],
    rows: sample.completed.rows.map((row) => ({ id: row.id, values: { ...row.values } })),
  };

  return (
    <SampleExample
      title={sample.title}
      introduction="Follow the given truth values through the conjunction and then the conditional. Unrevealed example cells are shown as dashes."
      stages={sample.stages}
      showCompletedAction={false}
      renderWork={(work) => {
        const answers: Answers = {};
        for (const row of sample.completed.rows) {
          for (const columnId of work.revealedColumnIds)
            answers[cellKey(row.id, columnId)] = row.values[columnId]!;
        }

        return (
          <TruthTable
            readOnly
            exercise={exercise}
            formula={sample.formula}
            answers={answers}
            feedback={null}
            solution={null}
            highlightColumnId={work.revealedColumnIds.at(-1)}
            label="Sample walkthrough truth table"
          />
        );
      }}
    />
  );
}
