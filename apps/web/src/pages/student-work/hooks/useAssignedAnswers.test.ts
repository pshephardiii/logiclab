import { act, renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useAssignedAnswers } from './useAssignedAnswers';
import { truthTreeWork, truthTreeAnswer } from '../../../../test/truth-tree-work-fixture';
import { saved, itemB } from '../../../../test/assignment-work-fixture';

test('loaded truth-tree structures stay separate from conceptual drafts and retain all saved identities', () => {
  const { result } = renderHook(() => useAssignedAnswers(truthTreeWork));
  const attempt = { ...saved, answers: { [itemB]: truthTreeAnswer } };
  act(() => result.current.resetAnswers(truthTreeWork, attempt));
  expect(result.current.truthTreeAnswers).toEqual({ [itemB]: truthTreeAnswer });
  expect(result.current.choiceAnswers).toEqual({});
  expect(result.current.proofAnswers).toEqual({});
  expect(result.current.dirty).toEqual([]);
  expect(result.current.responseFor(truthTreeWork.items[1]!)).toEqual(truthTreeAnswer);
  act(() => result.current.resetAnswers(truthTreeWork, null));
  expect(result.current.truthTreeAnswers).toEqual({});
  expect(result.current.dirty).toEqual([]);
});
