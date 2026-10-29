import { expect, test } from 'vitest';
import {
  savedConceptualAnswers,
  sameConceptualAnswer,
  conceptualAnswerFilled,
} from './conceptual-answers';
import { savedAnswerMaps } from './answers';
import {
  conceptualWork,
  conceptualSaved,
  truthItem,
  optionA,
  optionB,
} from '../../../../test/conceptual-work-fixture';
import { work, saved, itemA, itemB } from '../../../../test/assignment-work-fixture';

test('conceptual normalization retains false, creates blanks and never allocates table maps for choices', () => {
  const responses = savedConceptualAnswers(conceptualWork, conceptualSaved);
  expect(responses[itemA]).toEqual({ type: 'true_false', answer: false });
  expect(responses[itemB]).toEqual({ type: 'multiple_choice', optionId: null });
  expect(savedAnswerMaps(conceptualWork, conceptualSaved)).toEqual({});
  expect(savedConceptualAnswers(work, saved)).toEqual({});
});

test('repeated question occurrences keep independently allocated blank responses', () => {
  const assignment = {
    ...conceptualWork,
    items: [truthItem, { ...truthItem, id: itemB, position: 2 }],
  };
  const responses = savedConceptualAnswers(assignment, null);
  expect(responses[itemA]).toEqual(responses[itemB]);
  expect(responses[itemA]).not.toBe(responses[itemB]);
  responses[itemA] = { type: 'true_false', answer: false };
  expect(responses[itemB]).toEqual({ type: 'true_false', answer: null });
});

test('dirty equality follows response type and stable identity rather than labels', () => {
  expect(
    sameConceptualAnswer(
      { type: 'true_false', answer: false },
      { type: 'true_false', answer: false },
    ),
  ).toBe(true);
  expect(
    sameConceptualAnswer(
      { type: 'true_false', answer: false },
      { type: 'true_false', answer: null },
    ),
  ).toBe(false);
  expect(
    sameConceptualAnswer(
      { type: 'multiple_choice', optionId: optionA },
      { type: 'multiple_choice', optionId: optionB },
    ),
  ).toBe(false);
  expect(
    sameConceptualAnswer(
      { type: 'multiple_choice', optionId: null },
      { type: 'true_false', answer: null },
    ),
  ).toBe(false);
  expect(sameConceptualAnswer({ type: 'true_false', answer: false })).toBe(false);
});

test('filledness distinguishes false from unanswered', () => {
  expect(conceptualAnswerFilled({ type: 'true_false', answer: false })).toBe(true);
  expect(conceptualAnswerFilled({ type: 'true_false', answer: null })).toBe(false);
  expect(conceptualAnswerFilled({ type: 'multiple_choice', optionId: optionA })).toBe(true);
  expect(conceptualAnswerFilled({ type: 'multiple_choice', optionId: null })).toBe(false);
  expect(conceptualAnswerFilled()).toBe(false);
});
