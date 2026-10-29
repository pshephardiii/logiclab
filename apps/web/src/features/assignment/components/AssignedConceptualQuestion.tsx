import type {
  ConceptualAnswer,
  ConceptualFeedback,
  ConceptualSolution,
  StudentAssignment,
} from '@logiclab/contracts';
import { blankConceptualAnswer } from '../helpers/conceptual-answers';
import '../assignment.css';

type Props = {
  item: Extract<StudentAssignment['items'][number], { content: unknown }>;
  answer?: ConceptualAnswer;
  feedback?: ConceptualFeedback | null;
  solution?: ConceptualSolution | null;
  neutralBlanks?: boolean;
  readOnly: boolean;
  onAnswer: (answer: ConceptualAnswer) => void;
};

/** Shared student/review controls; keys and explanations arrive only via the solution prop. */
export function AssignedConceptualQuestion({
  item,
  answer,
  feedback,
  solution,
  neutralBlanks = false,
  readOnly,
  onAnswer,
}: Props) {
  const current = answer ?? blankConceptualAnswer(item);
  const content = item.content;
  const choices =
    content.type === 'true_false'
      ? [
          { id: 'true', text: 'True' },
          { id: 'false', text: 'False' },
        ]
      : content.options;
  const selected =
    current.type === 'true_false'
      ? current.answer === null
        ? null
        : String(current.answer)
      : current.optionId;
  const expected =
    solution?.type === 'true_false' && content.type === 'true_false'
      ? solution.correctAnswer
        ? 'True'
        : 'False'
      : solution?.type === 'multiple_choice' && content.type === 'multiple_choice'
        ? content.options.find((option) => option.id === solution.correctOptionId)?.text
        : undefined;
  const visibleFeedback = feedback && !(neutralBlanks && feedback.status === 'unanswered');
  return (
    <section className="panel assigned-item">
      <h2>
        Problem {item.position}: {item.title}
      </h2>
      {item.instructions && <p>{item.instructions}</p>}
      <fieldset className="conceptual-choices" disabled={readOnly}>
        <legend>{content.question}</legend>
        {choices.map((choice) => (
          <label key={choice.id}>
            <input
              type="radio"
              name={`conceptual-${item.id}`}
              value={choice.id}
              checked={selected === choice.id}
              onChange={() =>
                onAnswer(
                  content.type === 'true_false'
                    ? { type: 'true_false', answer: choice.id === 'true' }
                    : { type: 'multiple_choice', optionId: choice.id },
                )
              }
            />
            <span>{choice.text}</span>
          </label>
        ))}
      </fieldset>
      {!readOnly && (
        <button
          className="secondary"
          disabled={selected === null}
          onClick={() => onAnswer(blankConceptualAnswer(item))}
        >
          Clear answer
        </button>
      )}
      {readOnly && selected === null && <p>No answer selected.</p>}
      {visibleFeedback && (
        <p role="status" className={`conceptual-feedback ${feedback.status}`}>
          {feedback.status === 'correct'
            ? '✓ Correct'
            : feedback.status === 'incorrect'
              ? '✕ Incorrect'
              : 'Unanswered'}
        </p>
      )}
      {expected !== undefined && (
        <div className="conceptual-solution">
          <p>
            Correct answer: <strong>{expected}</strong>
          </p>
          {solution?.explanation && <p>{solution.explanation}</p>}
        </div>
      )}
    </section>
  );
}
