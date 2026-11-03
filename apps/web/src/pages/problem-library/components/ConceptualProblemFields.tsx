import { ConceptualAnswerOptions } from './ConceptualAnswerOptions';
import {
  changeConceptualOption,
  moveConceptualOption,
  removeConceptualOption,
} from '../helpers/conceptual-editor';
import { CONCEPTUAL_QUESTION_LIMITS } from '@logiclab/contracts';
import type { ProblemEditorFields } from '../helpers/problem-editor';

type Props = { fields: ProblemEditorFields; onChange: (fields: ProblemEditorFields) => void };

/** Option edits and moves retain IDs; new options always receive a fresh identity. */
export function ConceptualProblemFields({ fields, onChange }: Props) {
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
        <ConceptualAnswerOptions
          options={fields.options}
          correctOptionId={fields.correctOptionId}
          onTextChange={(id, text) => onChange(changeConceptualOption(fields, id, text))}
          onCorrectOptionChange={(correctOptionId) => onChange({ ...fields, correctOptionId })}
          onMove={(index, direction) => onChange(moveConceptualOption(fields, index, direction))}
          onRemove={(id) => onChange(removeConceptualOption(fields, id))}
          onAdd={() =>
            onChange({
              ...fields,
              options: [...fields.options, { id: crypto.randomUUID(), text: '' }],
            })
          }
        />
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
