import { CONCEPTUAL_QUESTION_LIMITS } from '@logiclab/contracts';
import type { ProblemEditorFields } from '../helpers/problem-editor';

type Props = { fields: ProblemEditorFields; onChange: (fields: ProblemEditorFields) => void };

/** Option edits and moves retain IDs; new options always receive a fresh identity. */
export function ConceptualProblemFields({ fields, onChange }: Props) {
  function changeOption(id: string, text: string) {
    onChange({
      ...fields,
      options: fields.options.map((option) => (option.id === id ? { ...option, text } : option)),
    });
  }
  function moveOption(index: number, delta: number) {
    const options = [...fields.options];
    [options[index], options[index + delta]] = [options[index + delta]!, options[index]!];
    onChange({ ...fields, options });
  }
  return (
    <>
      <label htmlFor="problem-question">Question</label>
      <textarea
        id="problem-question"
        required
        maxLength={CONCEPTUAL_QUESTION_LIMITS.question}
        value={fields.question}
        onChange={(event) => onChange({ ...fields, question: event.target.value })}
      />
      {fields.type === 'true_false' ? (
        <>
          <label htmlFor="problem-correct-answer">Correct answer</label>
          <select
            id="problem-correct-answer"
            required
            value={fields.correctAnswer}
            onChange={(event) =>
              onChange({
                ...fields,
                correctAnswer: event.target.value as ProblemEditorFields['correctAnswer'],
              })
            }
          >
            <option value="">Choose the correct answer</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </>
      ) : (
        <section aria-label="Answer options">
          <h3>Answer options</h3>
          <p className="help">
            Add 2–6 distinct options and select exactly one correct answer. Editing or reordering an
            option preserves its identity.
          </p>
          {fields.options.map((option, index) => (
            <div className="problem-option" key={option.id}>
              <label htmlFor={`option-${option.id}`}>Option {index + 1}</label>
              <input
                id={`option-${option.id}`}
                required
                maxLength={CONCEPTUAL_QUESTION_LIMITS.option}
                value={option.text}
                onChange={(event) => changeOption(option.id, event.target.value)}
              />
              <label className="correct-option">
                <input
                  type="radio"
                  name="problem-correct-option"
                  required
                  value={option.id}
                  checked={fields.correctOptionId === option.id}
                  onChange={() => onChange({ ...fields, correctOptionId: option.id })}
                />
                Correct option {index + 1}
              </label>
              <div className="action-row">
                <button
                  type="button"
                  className="secondary"
                  disabled={index === 0}
                  onClick={() => moveOption(index, -1)}
                >
                  Move option {index + 1} up
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={index === fields.options.length - 1}
                  onClick={() => moveOption(index, 1)}
                >
                  Move option {index + 1} down
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={fields.options.length <= CONCEPTUAL_QUESTION_LIMITS.minOptions}
                  onClick={() =>
                    onChange({
                      ...fields,
                      options: fields.options.filter((value) => value.id !== option.id),
                      correctOptionId:
                        fields.correctOptionId === option.id ? '' : fields.correctOptionId,
                    })
                  }
                >
                  Remove option {index + 1}
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            disabled={fields.options.length >= CONCEPTUAL_QUESTION_LIMITS.maxOptions}
            onClick={() =>
              onChange({
                ...fields,
                options: [...fields.options, { id: crypto.randomUUID(), text: '' }],
              })
            }
          >
            Add option
          </button>
        </section>
      )}
      <label htmlFor="problem-explanation">Explanation (optional)</label>
      <textarea
        id="problem-explanation"
        maxLength={CONCEPTUAL_QUESTION_LIMITS.explanation}
        value={fields.explanation}
        onChange={(event) => onChange({ ...fields, explanation: event.target.value })}
      />
      <p className="help">
        Students receive the explanation only when correct answers are revealed, never with
        correctness feedback or grade release alone.
      </p>
    </>
  );
}
