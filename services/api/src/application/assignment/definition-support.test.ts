import { dependencyDefinitionFixture } from '../../../test/derivation-fixture';
import { assignmentSchema } from '@logiclab/contracts';
import { assignment } from '../../../test/assignment-fixture';
import { derivationDefinitionFixture } from '../../../test/derivation-fixture';
import { supportedAssignmentDefinition } from './definition-support';
import { AssignmentOperationError } from './errors';
import { mapAssignmentError } from '../../routes/assignment/errors';

test('published proof definitions admit graded work with submission-time feedback', () => {
  const proof = derivationDefinitionFixture();
  expect(
    supportedAssignmentDefinition(proof, {
      assessmentMode: 'ungraded_practice',
      feedbackTiming: 'on_check',
    }),
  ).toEqual(proof);
  expect(
    supportedAssignmentDefinition(proof, {
      assessmentMode: 'graded',
      feedbackTiming: 'on_submission',
    }),
  ).toEqual(proof);
  expect(
    supportedAssignmentDefinition(
      { type: 'truth_table', definitionVersion: 1, formula: 'P' },
      { assessmentMode: 'graded', feedbackTiming: 'on_submission' },
    ).type,
  ).toBe('truth_table');
});
test.each(['graded', 'completion_only', 'ungraded_practice'] as const)(
  'owner assignment contracts enforce proof mode for %s without changing published snapshots',
  (mode) => {
    const input = {
      ...assignment,
      assessmentMode: mode,
      feedbackTiming: mode === 'ungraded_practice' ? 'on_check' : 'on_submission',
      solutionAccess: 'never',
      items: assignment.items.map((item) => ({
        ...item,
        problemVersion: { ...item.problemVersion, definition: derivationDefinitionFixture() },
      })),
    };
    const snapshot = structuredClone(input);
    expect(assignmentSchema.safeParse(input).success).toBe(true);
    expect(input).toEqual(snapshot);
  },
);
test('proof mode errors provide an actionable safe response', () => {
  const error = Object.assign(new AssignmentOperationError('proof_mode_unavailable'), {
    referenceProof: 'PRIVATE',
  });
  const response = mapAssignmentError(error);
  expect(response).toMatchObject({ status: 409, code: 'DERIVATION_ASSIGNMENT_MODE_UNAVAILABLE' });
  expect(response.message).toContain('ungraded practice');
  expect(JSON.stringify(response)).not.toContain('PRIVATE');
});

test.each(['graded', 'completion_only'])(
  '%s proof admission excludes pre-submission feedback policies',
  (assessmentMode) => {
    const proof = derivationDefinitionFixture();
    expect(
      supportedAssignmentDefinition(proof, {
        assessmentMode,
        feedbackTiming: 'on_submission',
      }),
    ).toEqual(proof);
    for (const feedbackTiming of ['on_check', 'immediate'])
      expect(() =>
        supportedAssignmentDefinition(proof, { assessmentMode, feedbackTiming }),
      ).toThrow(AssignmentOperationError);
  },
);

test('dependency admission supports submission-time feedback and rejects pre-submission graded checks', () => {
  const definition = dependencyDefinitionFixture();
  const policy = { assessmentMode: 'graded', feedbackTiming: 'on_submission' };
  expect(supportedAssignmentDefinition(definition, policy)).toEqual(definition);
  expect(supportedAssignmentDefinition(definition, policy)).toEqual(definition);
  expect(() =>
    supportedAssignmentDefinition(definition, { ...policy, feedbackTiming: 'on_check' }),
  ).toThrow(AssignmentOperationError);
});
