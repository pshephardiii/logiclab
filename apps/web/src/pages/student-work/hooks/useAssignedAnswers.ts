import { assignmentCompletionReady } from '../helpers/assigned-work-state';
import { useCallback, useMemo, useState } from 'react';
import type { ConceptualAnswer } from '@logiclab/contracts';
import type { SavedDerivationAnswer as DerivationAnswer } from '@logiclab/contracts/saved-student-work';
import type {
  SavedStudentResponseValue as AssignmentResponseValue,
  SavedStudentAssignment as StudentAssignment,
  SavedStudentAttempt as StudentAttempt,
} from '@logiclab/contracts/saved-student-work';
import {
  blankDerivationAnswer,
  savedProofAnswers,
  sameProofAnswer,
} from '../../../features/assignment/helpers/proof-answers';
import type { Answers } from '../../../features/truthTable/types';
import { submittedAnswers } from '../../../features/truthTable/helpers/submitted-answers';
import { savedAnswerMaps, sameAnswers } from '../../../features/assignment/helpers/answers';
import {
  blankConceptualAnswer,
  savedConceptualAnswers,
  sameConceptualAnswer,
} from '../../../features/assignment/helpers/conceptual-answers';

/** Local drafts and saved baselines only; requests and feedback lifecycles stay with the caller. */
export function useAssignedAnswers(assignment: StudentAssignment | null) {
  const [answers, setAnswers] = useState<Record<string, Answers>>({});
  const [baseline, setBaseline] = useState<Record<string, Answers>>({});
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, ConceptualAnswer>>({});
  const [choiceBaseline, setChoiceBaseline] = useState<Record<string, ConceptualAnswer>>({});
  const [proofAnswers, setProofAnswers] = useState<Record<string, DerivationAnswer>>({});
  const [proofBaseline, setProofBaseline] = useState<Record<string, DerivationAnswer>>({});
  const dirty = useMemo(
    () => [
      ...Object.keys(answers).filter((id) => !sameAnswers(answers[id]!, baseline[id])),
      ...Object.keys(proofAnswers).filter(
        (id) => !sameProofAnswer(proofAnswers[id]!, proofBaseline[id]),
      ),
      ...Object.keys(choiceAnswers).filter(
        (id) => !sameConceptualAnswer(choiceAnswers[id]!, choiceBaseline[id]),
      ),
    ],
    [answers, baseline, choiceAnswers, choiceBaseline, proofAnswers, proofBaseline],
  );
  const completionReady = useMemo(
    () => assignmentCompletionReady(assignment, { answers, choiceAnswers, proofAnswers }),
    [assignment, answers, choiceAnswers, proofAnswers],
  );

  const resetAnswers = useCallback((source: StudentAssignment, attempt: StudentAttempt | null) => {
    const tables = savedAnswerMaps(source, attempt);
    setAnswers(tables);
    setBaseline(tables);
    const choices = savedConceptualAnswers(source, attempt);
    setChoiceAnswers(choices);
    setChoiceBaseline(choices);
    const proofs = savedProofAnswers(source, attempt);
    setProofAnswers(proofs);
    setProofBaseline(proofs);
  }, []);
  const changeTableAnswers = useCallback((itemId: string, snapshot: Answers) => {
    setAnswers((previous) => ({ ...previous, [itemId]: snapshot }));
  }, []);
  const changeChoiceAnswers = useCallback((itemId: string, snapshot: ConceptualAnswer) => {
    setChoiceAnswers((previous) => ({ ...previous, [itemId]: snapshot }));
  }, []);
  const changeProofAnswers = useCallback((itemId: string, snapshot: DerivationAnswer) => {
    setProofAnswers((previous) => ({ ...previous, [itemId]: snapshot }));
  }, []);
  // Advance only the confirmed snapshot's baseline, leaving every other draft untouched.
  const markSaved = useCallback(
    (itemId: string, tableSnapshot: Answers, response: AssignmentResponseValue) => {
      if (Array.isArray(response))
        setBaseline((previous) => ({ ...previous, [itemId]: tableSnapshot }));
      else if (response.type === 'derivation')
        setProofBaseline((previous) => ({ ...previous, [itemId]: response }));
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
      : item.content.type === 'derivation'
        ? (proofAnswers[item.id] ?? blankDerivationAnswer(item.content.format))
        : (choiceAnswers[item.id] ?? blankConceptualAnswer({ content: item.content }));
  }
  return {
    answers,
    choiceAnswers,
    proofAnswers,
    dirty,
    completionReady,
    resetAnswers,
    changeTableAnswers,
    changeChoiceAnswers,
    changeProofAnswers,
    markSaved,
    responseFor,
  };
}
