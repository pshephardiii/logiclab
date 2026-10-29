import { useCallback, useMemo, useState } from 'react';
import type {
  AssignmentResponseValue,
  ConceptualAnswer,
  StudentAssignment,
  StudentAttempt,
} from '@logiclab/contracts';
import type { Answers } from '../../../features/truthTable/types';
import { submittedAnswers } from '../../../features/truthTable/helpers/submitted-answers';
import { savedAnswerMaps, sameAnswers } from '../../../features/assignment/helpers/answers';
import {
  blankConceptualAnswer,
  savedConceptualAnswers,
  sameConceptualAnswer,
  conceptualAnswerFilled,
} from '../../../features/assignment/helpers/conceptual-answers';

/** Local drafts and saved baselines only; requests and feedback lifecycles stay with the caller. */
export function useAssignedAnswers(assignment: StudentAssignment | null) {
  const [answers, setAnswers] = useState<Record<string, Answers>>({});
  const [baseline, setBaseline] = useState<Record<string, Answers>>({});
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, ConceptualAnswer>>({});
  const [choiceBaseline, setChoiceBaseline] = useState<Record<string, ConceptualAnswer>>({});
  const dirty = useMemo(
    () => [
      ...Object.keys(answers).filter((id) => !sameAnswers(answers[id]!, baseline[id])),
      ...Object.keys(choiceAnswers).filter(
        (id) => !sameConceptualAnswer(choiceAnswers[id]!, choiceBaseline[id]),
      ),
    ],
    [answers, baseline, choiceAnswers, choiceBaseline],
  );
  const completionReady = useMemo(
    () =>
      Boolean(assignment?.items.length) &&
      Boolean(
        assignment?.items.every((item) =>
          'exercise' in item
            ? submittedAnswers(item.exercise, answers[item.id] ?? {}).every(
                (answer) => answer.value !== null,
              )
            : conceptualAnswerFilled(choiceAnswers[item.id]),
        ),
      ),
    [assignment, answers, choiceAnswers],
  );

  const resetAnswers = useCallback((source: StudentAssignment, attempt: StudentAttempt | null) => {
    const tables = savedAnswerMaps(source, attempt);
    setAnswers(tables);
    setBaseline(tables);
    const choices = savedConceptualAnswers(source, attempt);
    setChoiceAnswers(choices);
    setChoiceBaseline(choices);
  }, []);
  const changeTableAnswers = useCallback((itemId: string, snapshot: Answers) => {
    setAnswers((previous) => ({ ...previous, [itemId]: snapshot }));
  }, []);
  const changeChoiceAnswers = useCallback((itemId: string, snapshot: ConceptualAnswer) => {
    setChoiceAnswers((previous) => ({ ...previous, [itemId]: snapshot }));
  }, []);
  // Advance only the confirmed snapshot's baseline, leaving every other draft untouched.
  const markSaved = useCallback(
    (itemId: string, tableSnapshot: Answers, response: AssignmentResponseValue) => {
      if (Array.isArray(response))
        setBaseline((previous) => ({ ...previous, [itemId]: tableSnapshot }));
      else setChoiceBaseline((previous) => ({ ...previous, [itemId]: response }));
    },
    [],
  );
  function responseFor(
    item: StudentAssignment['items'][number],
    tableSnapshot = answers[item.id] ?? {},
  ): AssignmentResponseValue {
    return 'exercise' in item
      ? submittedAnswers(item.exercise, tableSnapshot)
      : (choiceAnswers[item.id] ?? blankConceptualAnswer(item));
  }
  return {
    answers,
    choiceAnswers,
    dirty,
    completionReady,
    resetAnswers,
    changeTableAnswers,
    changeChoiceAnswers,
    markSaved,
    responseFor,
  };
}
