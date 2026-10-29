import type { ConceptualQuestionDefinition } from '@logiclab/contracts';

type Props = { definition: ConceptualQuestionDefinition };

/** Instructor-only read view; authored keys must never be used as student question content. */
export function ConceptualQuestionSummary({ definition }: Props) {
  return (
    <div>
      <p>{definition.question}</p>
      {definition.type === 'multiple_choice' && (
        <ul>
          {definition.options.map((option) => (
            <li key={option.id}>
              {option.text}
              {option.id === definition.correctOptionId ? ' (correct answer)' : ''}
            </li>
          ))}
        </ul>
      )}
      {definition.type === 'true_false' && (
        <p>Correct answer: {definition.correctAnswer ? 'True' : 'False'}</p>
      )}
      {definition.explanation && <p>Explanation: {definition.explanation}</p>}
    </div>
  );
}
