import type { TruthTableCheckResponse } from '@logiclab/contracts';

type Props = {
  label: string;
  value: boolean | null | undefined;
  status?: TruthTableCheckResponse['cells'][number]['status'];
  expected?: boolean;
  feedbackId: string;
  onChange: (value: boolean | null) => void;
};

/**
 * Renders a controlled blank/T/F input with accessible feedback and an optional solution value.
 */
export function AnswerCell({ label, value, status, expected, feedbackId, onChange }: Props) {
  return (
    <div className="answer-cell">
      <div className="answer-values">
        <select
          className="answer-select"
          aria-label={label}
          aria-describedby={status ? feedbackId : undefined}
          aria-invalid={status === 'incorrect'}
          value={value == null ? '' : value ? 'T' : 'F'}
          onChange={(event) =>
            onChange(event.target.value === '' ? null : event.target.value === 'T')
          }
        >
          <option value="" aria-label="Blank">
            —
          </option>
          <option value="T">T</option>
          <option value="F">F</option>
        </select>
        {typeof expected === 'boolean' && (
          <span
            className={`solution-value solution-${expected ? 'true' : 'false'}`}
            role="note"
            aria-label={`Correct answer: ${expected ? 'T' : 'F'}`}
          >
            {expected ? 'T' : 'F'}
          </span>
        )}
      </div>
      {status && (
        <span id={feedbackId} className={`cell-feedback ${status}`}>
          <span aria-hidden="true">
            {status === 'correct' ? '✓ ' : status === 'incorrect' ? '✕ ' : ''}
          </span>
          {status === 'correct' ? 'Correct' : status === 'incorrect' ? 'Incorrect' : 'Unanswered'}
        </span>
      )}
    </div>
  );
}
