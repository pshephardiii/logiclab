import { assertTruthTreeWorkPolicy } from './truth-tree-policy';
import { assignmentAdmissionDefinition } from '../assignment/definition-support';
import { truthTreeDefinitionFixture } from '../../../test/truth-tree-fixture';

test.each(['on_check', 'immediate'])('practice truth trees allow %s checking', (feedbackTiming) => {
  const policy = { assessmentMode: 'ungraded_practice', feedbackTiming };
  expect(() => assertTruthTreeWorkPolicy(policy)).not.toThrow();
  expect(assignmentAdmissionDefinition(truthTreeDefinitionFixture(), policy).type).toBe(
    'truth_tree',
  );
});

test.each(['graded', 'completion_only'])(
  '%s truth-tree finalization requires submission-time feedback',
  (assessmentMode) => {
    const policy = { assessmentMode, feedbackTiming: 'on_submission' };
    expect(() => assertTruthTreeWorkPolicy(policy)).not.toThrow();
    expect(assignmentAdmissionDefinition(truthTreeDefinitionFixture(), policy).type).toBe(
      'truth_tree',
    );
    expect(() => assertTruthTreeWorkPolicy({ ...policy, feedbackTiming: 'on_check' })).toThrow(
      'unsupported_policy',
    );
    expect(() =>
      assignmentAdmissionDefinition(truthTreeDefinitionFixture(), {
        ...policy,
        feedbackTiming: 'on_check',
      }),
    ).toThrow('proof_mode_unavailable');
  },
);

test('invalid practice feedback policies cannot admit writes', () => {
  expect(() =>
    assertTruthTreeWorkPolicy({
      assessmentMode: 'ungraded_practice',
      feedbackTiming: 'on_submission',
    }),
  ).toThrow('unsupported_policy');
});
