import { useState } from 'react';
import type {
  ConceptualAnswer,
  ConceptualQuestionDefinition,
  ConceptualSolution,
} from '@logiclab/contracts';
import { AssignedConceptualQuestion } from '../../../features/assignment/components/AssignedConceptualQuestion';

/** Instructor-only local preview; it never saves an attempt or calls student resource endpoints. */
export function ConceptualProblemPreview({
  definition,
}: {
  definition: ConceptualQuestionDefinition;
}) {
  const [answer, setAnswer] = useState<ConceptualAnswer>(
    definition.type === 'true_false'
      ? { type: 'true_false', answer: null }
      : { type: 'multiple_choice', optionId: null },
  );
  const [revealed, setRevealed] = useState(false);
  const content =
    definition.type === 'true_false'
      ? {
          type: definition.type,
          definitionVersion: definition.definitionVersion,
          question: definition.question,
        }
      : {
          type: definition.type,
          definitionVersion: definition.definitionVersion,
          question: definition.question,
          options: definition.options,
        };
  const solution: ConceptualSolution =
    definition.type === 'true_false'
      ? {
          type: definition.type,
          correctAnswer: definition.correctAnswer,
          explanation: definition.explanation ?? null,
        }
      : {
          type: definition.type,
          correctOptionId: definition.correctOptionId,
          explanation: definition.explanation ?? null,
        };
  return (
    <section aria-label="Problem preview">
      <h2>Question preview</h2>
      <p className="help">
        Instructor preview only. Trying an answer here does not save student work.
      </p>
      <AssignedConceptualQuestion
        item={{
          id: 'instructor-preview',
          position: 1,
          title: 'Preview',
          instructions: null,
          content,
        }}
        answer={answer}
        readOnly={false}
        onAnswer={setAnswer}
        solution={revealed ? solution : null}
      />
      <button className="secondary" onClick={() => setRevealed((value) => !value)}>
        {revealed ? 'Hide preview answer' : 'Show preview answer'}
      </button>
    </section>
  );
}
