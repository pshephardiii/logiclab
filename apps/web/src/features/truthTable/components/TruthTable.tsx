import type { TruthTableExerciseResponse, TruthTableCheckResponse, TruthTableSolutionResponse } from '@logiclab/contracts';

import { cellKey } from '../types';
import type { Answers } from '../types';

type Props = {
  feedback: TruthTableCheckResponse | null;
  solution: TruthTableSolutionResponse | null;
  exercise: TruthTableExerciseResponse;
  formula: string;
  answers: Answers;
  onAnswer: (rowId: string, columnId: string, value: boolean | null) => void;
};

export function TruthTable({ exercise, formula, answers, onAnswer, feedback, solution }: Props) {
  const statuses = new Map(feedback?.cells.map(cell => [cellKey(cell.rowId, cell.columnId), cell.status]));
  const solutionRows = new Map(solution?.rows.map(row => [row.id, row.values]));
  return (
    <div className="table-scroll" role="region" aria-label="Truth table, scroll horizontally for more columns" tabIndex={0}>
      <table>
        <caption>Truth table for {formula}</caption>
        <thead><tr>
          <th scope="col">Row</th>
          {exercise.columns.map(column => (
            <th scope="col" key={column.id} className={column.isFinal ? 'final-column' : undefined}>
              <span className="formula-label">{column.label}</span>
              <span className="column-kind">{column.kind === 'given' ? 'Given' : column.isFinal ? 'Final answer' : 'Intermediate'}</span>
            </th>
          ))}
        </tr></thead>
        <tbody>{exercise.rows.map((row, index) => {
          const given = exercise.variables.map(name => `${name}=${row.values[`var:v1:${name}`] ? 'T' : 'F'}`).join(', ');
          return (
            <tr key={row.id}>
              <th scope="row">{index + 1}</th>
              {exercise.columns.map((column, columnIndex) => {
                const value = answers[cellKey(row.id, column.id)];
                const status = statuses.get(cellKey(row.id, column.id));
                const expected = solutionRows.get(row.id)?.[column.id];
                const feedbackId = `feedback-${index}-${columnIndex}`;
                return (
                  <td key={column.id} className={column.isFinal ? 'final-column' : undefined}>
                    {column.kind === 'given' ? <span className="given-value">{row.values[column.id] ? 'T' : 'F'}</span> : (
                      <div className="answer-cell"><select aria-describedby={status ? feedbackId : undefined} aria-invalid={status === 'incorrect'} aria-label={`Row ${index + 1}, ${given}: ${column.label}`}
                        value={value == null ? '' : value ? 'T' : 'F'}
                        onChange={event => onAnswer(row.id, column.id, event.target.value === '' ? null : event.target.value === 'T')}>
                        <option value="">Blank</option><option value="T">T</option><option value="F">F</option>
                      </select>
                      {status && <span id={feedbackId} className={`cell-feedback ${status}`}>{status === 'correct' ? 'Correct' : status === 'incorrect' ? 'Incorrect' : 'Unanswered'}</span>}
                      {typeof expected === 'boolean' && <span className="solution-value">Solution: {expected ? 'T' : 'F'}</span>}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}
