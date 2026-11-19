import { assertTruthTreePracticePolicy } from './truth-tree-policy';
import { assignmentAdmissionDefinition } from '../assignment/definition-support';
import { truthTreeDefinitionFixture } from '../../../test/truth-tree-fixture';

test.each(['on_check', 'immediate'])('practice truth trees allow %s checking', (feedbackTiming) => {
  const policy = { assessmentMode: 'ungraded_practice', feedbackTiming };
  expect(() => assertTruthTreePracticePolicy(policy)).not.toThrow();
  expect(assignmentAdmissionDefinition(truthTreeDefinitionFixture(), policy).type).toBe(
    'truth_tree',
  );
});

test.each(['graded', 'completion_only'])(
  '%s truth-tree finalization remains guarded',
  (assessmentMode) => {
    const policy = { assessmentMode, feedbackTiming: 'on_submission' };
    expect(() => assertTruthTreePracticePolicy(policy)).toThrow('unsupported_policy');
    expect(() => assignmentAdmissionDefinition(truthTreeDefinitionFixture(), policy)).toThrow();
  },
);

test('invalid practice feedback policies cannot admit writes', () => {
  expect(() =>
    assertTruthTreePracticePolicy({
      assessmentMode: 'ungraded_practice',
      feedbackTiming: 'on_submission',
    }),
  ).toThrow('unsupported_policy');
});
