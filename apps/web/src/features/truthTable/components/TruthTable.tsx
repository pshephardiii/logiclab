import { AnswerCell } from './AnswerCell';
import type {
  TruthTableExerciseResponse,
  TruthTableCheckResponse,
  TruthTableSolutionResponse,
} from '@logiclab/contracts';

import { cellKey } from '../types';
import type { Answers } from '../types';
import { formulaNotation } from '../../../components/formula/formula-notation';

type Props = {
  feedback: TruthTableCheckResponse | null;
  solution: TruthTableSolutionResponse | null;
  exercise: TruthTableExerciseResponse;
  formula: string;
  answers: Answers;
  highlightColumnId?: string;
  label?: string;
} & (
  | { readOnly: true; onAnswer?: never }
  | { readOnly?: false; onAnswer: (rowId: string, columnId: string, value: boolean | null) => void }
);

/**
 * Composes deterministic rows with editable answers or read-only example values.
 * Associates check results and solution values with structural row/column IDs.
 */
export function TruthTable({
  exercise,
  formula,
  answers,
  onAnswer,
  feedback,
  solution,
  readOnly,
  highlightColumnId,
  label = 'Truth table, scroll horizontally for more columns',
}: Props) {
  // Canonical labels include generated parentheses; the final heading follows authored grouping.
  const columns = exercise.columns.map((column) => ({
    ...column,
    label: column.isFinal ? formulaNotation(formula.trim()) : column.label,
  }));
  const statuses = new Map(
    feedback?.cells.map((cell) => [cellKey(cell.rowId, cell.columnId), cell.status]),
  );

  const solutionRows = new Map(solution?.rows.map((row) => [row.id, row.values]));

  return (
    <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
      <table>
        <caption>Truth table for {formula}</caption>
        <thead>
          <tr>
            <th scope="col">Row</th>
            {columns.map((column) => (
              <th
                scope="col"
                key={column.id}
                className={
                  [
                    column.isFinal ? 'final-column' : '',
                    column.id === highlightColumnId ? 'sample-column-change' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              >
                <span className="formula-label">{column.label}</span>
                <span className="column-kind">
                  {column.kind === 'given'
                    ? 'Given'
                    : column.isFinal
                      ? 'Final answer'
                      : 'Intermediate'}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {exercise.rows.map((row, index) => {
            const given = exercise.variables
              .map((name) => `${name}=${row.values[`var:v1:${name}`] ? 'T' : 'F'}`)
              .join(', ');

            return (
              <tr key={row.id}>
                <th scope="row">{index + 1}</th>
                {columns.map((column, columnIndex) => {
                  const value = answers[cellKey(row.id, column.id)];
                  const status = statuses.get(cellKey(row.id, column.id));
                  const expected = solutionRows.get(row.id)?.[column.id];
                  const feedbackId = `feedback-${index}-${columnIndex}`;

                  return (
                    <td
                      key={column.id}
                      className={
                        [
                          column.isFinal ? 'final-column' : '',
                          column.id === highlightColumnId ? 'sample-column-change' : '',
                          column.kind === 'answer' && status ? `answer-${status}` : '',
                        ]
                          .filter(Boolean)
                          .join(' ') || undefined
                      }
                    >
                      {column.kind === 'given' ? (
                        <span className="given-value">{row.values[column.id] ? 'T' : 'F'}</span>
                      ) : readOnly ? (
                        <span
                          className="sample-table-value"
                          aria-label={value == null ? 'Not revealed' : undefined}
                        >
                          {value == null ? '—' : value ? 'T' : 'F'}
                        </span>
                      ) : (
                        <AnswerCell
                          label={`Row ${index + 1}, ${given}: ${column.label}`}
                          value={value}
                          status={status}
                          expected={expected}
                          feedbackId={feedbackId}
                          onChange={(answer) => onAnswer(row.id, column.id, answer)}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
