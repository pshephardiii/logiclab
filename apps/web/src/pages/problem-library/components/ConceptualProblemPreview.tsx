import { ProblemType } from '@logiclab/contracts/problem-type';
import { conceptualPreviewData } from '../helpers/conceptual-preview';
import { useState } from 'react';
import type { ConceptualAnswer, ConceptualQuestionDefinition } from '@logiclab/contracts';
import { AssignedConceptualQuestion } from '../../../features/assignment/components/AssignedConceptualQuestion';

/** Instructor-only local preview; it never saves an attempt or calls student resource endpoints. */
export function ConceptualProblemPreview({
  definition,
}: {
  definition: ConceptualQuestionDefinition;
}) {
  const [answer, setAnswer] = useState<ConceptualAnswer>(
    definition.type === ProblemType.TrueFalse
      ? { type: ProblemType.TrueFalse, answer: null }
      : { type: ProblemType.MultipleChoice, optionId: null },
  );

  const [revealed, setRevealed] = useState(false);
  const { content, solution } = conceptualPreviewData(definition);

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
