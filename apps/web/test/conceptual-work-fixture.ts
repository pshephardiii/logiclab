import type { StudentAssignment, StudentAttempt } from '@logiclab/contracts';
import { work, saved, itemA, itemB } from './assignment-work-fixture';

export const optionA = 'b1111111-1111-4111-8111-111111111111';
export const optionB = 'b2222222-2222-4222-8222-222222222222';
export const truthItem = {
  id: itemA,
  position: 1,
  title: 'True or false',
  instructions: 'Choose one answer.',
  content: {
    type: 'true_false' as const,
    definitionVersion: 1 as const,
    question: 'Every contradiction is true.',
  },
};
export const choiceItem = {
  id: itemB,
  position: 2,
  title: 'Classification',
  instructions: null,
  content: {
    type: 'multiple_choice' as const,
    definitionVersion: 1 as const,
    question: 'Which is always false?',
    options: [
      { id: optionA, text: 'Contradiction' },
      { id: optionB, text: 'Tautology' },
    ],
  },
};
export const conceptualWork: StudentAssignment = {
  ...work,
  assessmentMode: 'ungraded_practice',
  feedbackTiming: 'on_check',
  solutionAccess: 'anytime',
  items: [truthItem, choiceItem],
};
export const conceptualSaved: StudentAttempt = {
  ...saved,
  answers: {
    [itemA]: { type: 'true_false', answer: false },
    [itemB]: { type: 'multiple_choice', optionId: null },
  },
};
