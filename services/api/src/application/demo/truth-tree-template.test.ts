import { truthTreeDefinitionSchema } from '@logiclab/contracts/truth-tree-authoring';
import { DEMO_TRUTH_TREES } from './truth-tree-template';
import { DEMO_TEMPLATE } from './template';
import {
  truthTreePublicationDefinition,
  checkTruthTreeReference,
  hasFinishedTruthTreeReference,
} from '../problem/truth-tree/authoring';

test.each(
  DEMO_TRUTH_TREES.map((example, index) => ({
    ...example,
    outcome: index === 0 ? 'valid' : 'invalid',
  })),
)('$title is a publishable, all-path finished $outcome reference', ({ definition, outcome }) => {
  expect(truthTreeDefinitionSchema.parse(definition)).toEqual(definition);
  expect(truthTreePublicationDefinition(definition)).toEqual(definition);
  expect(checkTruthTreeReference(definition)).toMatchObject({
    status: 'checked',
    report: { status: 'verified', argumentStatus: outcome },
  });
  expect(hasFinishedTruthTreeReference(definition)).toBe(true);
});

test('template adds distinct truth-tree journeys without replacing available derivations', () => {
  expect(DEMO_TEMPLATE.version).toBe(9);
  expect(
    new Set([
      DEMO_TEMPLATE.truthTreePracticeAssignmentTitle,
      DEMO_TEMPLATE.truthTreeGradedAssignmentTitle,
      DEMO_TEMPLATE.truthTreeCompletionAssignmentTitle,
      DEMO_TEMPLATE.proofPracticeAssignmentTitle,
      DEMO_TEMPLATE.proofGradedAssignmentTitle,
      DEMO_TEMPLATE.proofCompletionAssignmentTitle,
    ]).size,
  ).toBe(6);
});
