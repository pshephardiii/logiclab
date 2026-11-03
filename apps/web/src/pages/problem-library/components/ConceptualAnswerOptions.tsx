import { CONCEPTUAL_QUESTION_LIMITS } from '@logiclab/contracts';
import type { ProblemEditorFields } from '../helpers/problem-editor';

type Props = {
  options: ProblemEditorFields['options'];
  correctOptionId: string;
  onTextChange: (id: string, text: string) => void;
  onCorrectOptionChange: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
};

/** Controlled option fields; the parent owns edits, selection updates and new identities. */
export function ConceptualAnswerOptions({
  options,
  correctOptionId,
  onTextChange,
  onCorrectOptionChange,
  onMove,
  onRemove,
  onAdd,
}: Props) {
  return (
    <section aria-label="Answer options">
      <h3>Answer options</h3>
      <p className="help">
        Add 2–6 distinct options and select exactly one correct answer. Editing or reordering an
        option preserves its identity.
      </p>
      {options.map((option, index) => (
        <div className="problem-option" key={option.id}>
          <label htmlFor={`option-${option.id}`}>Option {index + 1}</label>
          <input
            id={`option-${option.id}`}
            required
            maxLength={CONCEPTUAL_QUESTION_LIMITS.option}
            value={option.text}
            onChange={(event) => onTextChange(option.id, event.target.value)}
          />
          <label className="correct-option">
            <input
              type="radio"
              name="problem-correct-option"
              required
              value={option.id}
              checked={correctOptionId === option.id}
              onChange={() => onCorrectOptionChange(option.id)}
            />
            Correct option {index + 1}
          </label>
          <div className="action-row">
            <button
              type="button"
              className="secondary"
              disabled={index === 0}
              onClick={() => onMove(index, -1)}
            >
              Move option {index + 1} up
            </button>
            <button
              type="button"
              className="secondary"
              disabled={index === options.length - 1}
              onClick={() => onMove(index, 1)}
            >
              Move option {index + 1} down
            </button>
            <button
              type="button"
              className="secondary"
              disabled={options.length <= CONCEPTUAL_QUESTION_LIMITS.minOptions}
              onClick={() => onRemove(option.id)}
            >
              Remove option {index + 1}
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        disabled={options.length >= CONCEPTUAL_QUESTION_LIMITS.maxOptions}
        onClick={onAdd}
      >
        Add option
      </button>
    </section>
  );
}
