import { assignmentSchema } from '@logiclab/contracts';
import { assignment } from '../../../test/assignment-fixture';
import { derivationDefinitionFixture } from '../../../test/derivation-fixture';
import { supportedAssignmentDefinition } from './definition-support';
import { AssignmentOperationError } from './errors';
import { mapAssignmentError } from '../../routes/assignment/errors';

test('published proof definitions are admitted only for practice; objective definitions retain every mode', () => {
  const proof = derivationDefinitionFixture();
  expect(supportedAssignmentDefinition(proof, 'ungraded_practice')).toEqual(proof);
  for (const mode of ['graded', 'completion_only']) {
    expect(() => supportedAssignmentDefinition(proof, mode)).toThrow(AssignmentOperationError);
    expect(
      supportedAssignmentDefinition(
        { type: 'truth_table', definitionVersion: 1, formula: 'P' },
        mode,
      ).type,
    ).toBe('truth_table');
  }
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
    expect(assignmentSchema.safeParse(input).success).toBe(mode === 'ungraded_practice');
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
