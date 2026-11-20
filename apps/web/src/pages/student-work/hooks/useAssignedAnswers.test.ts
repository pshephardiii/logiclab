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

test('repeated truth-tree occurrences keep independent baselines and advancing a saved snapshot cannot overwrite newer work', () => {
  const first = truthTreeWork.items[1]!;
  const secondId = 'c4444444-4444-4444-8444-444444444444';
  const assignment = { ...truthTreeWork, items: [first, { ...first, id: secondId, position: 3 }] };
  const { result } = renderHook(() => useAssignedAnswers(assignment));
  act(() => result.current.resetAnswers(assignment, null));
  act(() => {
    result.current.changeTruthTreeAnswers(itemB, truthTreeAnswer);
    result.current.changeTruthTreeAnswers(secondId, truthTreeAnswer);
  });
  expect(result.current.dirty).toEqual([itemB, secondId]);
  const newer = structuredClone(truthTreeAnswer);
  newer.tree.occurrences[0]!.formula = '';
  act(() => result.current.changeTruthTreeAnswers(itemB, newer));
  act(() => result.current.markSaved(itemB, {}, truthTreeAnswer));
  expect(result.current.truthTreeAnswers[itemB]).toEqual(newer);
  expect(result.current.dirty).toEqual([itemB, secondId]);
  act(() => result.current.changeTruthTreeAnswers(itemB, truthTreeAnswer));
  expect(result.current.dirty).toEqual([secondId]);
});

test('validity choices have saved baselines and reverting an older omitted choice to null is clean', () => {
  const older = { type: 'truth_tree' as const, tree: truthTreeAnswer.tree };
  const { result } = renderHook(() => useAssignedAnswers(truthTreeWork));
  act(() => result.current.resetAnswers(truthTreeWork, { ...saved, answers: { [itemB]: older } }));
  act(() => result.current.changeTruthTreeAnswers(itemB, { ...older, verdict: 'valid' }));
  expect(result.current.dirty).toEqual([itemB]);
  act(() => result.current.markSaved(itemB, {}, older));
  expect(result.current.truthTreeAnswers[itemB]!.verdict).toBe('valid');
  expect(result.current.dirty).toEqual([itemB]);
  act(() => result.current.changeTruthTreeAnswers(itemB, { ...older, verdict: null }));
  expect(result.current.dirty).toEqual([]);
});
