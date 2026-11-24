import { truthTreeDefinitionSchema } from '@logiclab/contracts/truth-tree-authoring';
import { DEMO_TRUTH_TREES } from './truth-tree-template';
import { DEMO_TEMPLATE, DEMO_DERIVATIONS } from './template';
import {
  checkFitchProof,
  checkDependencyProof,
  isFinishedFitchProofAttempt,
  isFinishedDependencyProofAttempt,
} from '@logiclab/logic-engine/proof';
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
  expect(definition).toMatchObject({
    ruleCatalogVersion: 2,
    formulaGroupingVersion: 1,
    referenceTree: { treeVersion: 2 },
  });
  expect(truthTreeDefinitionSchema.parse(definition)).toEqual(definition);
  expect(truthTreePublicationDefinition(definition)).toEqual(definition);
  expect(checkTruthTreeReference(definition)).toMatchObject({
    status: 'checked',
    report: { status: 'verified', argumentStatus: outcome },
  });
  expect(hasFinishedTruthTreeReference(definition)).toBe(true);
});

test('template adds distinct truth-tree journeys without replacing available derivations', () => {
  expect(DEMO_TEMPLATE.version).toBe(11);
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

test.each(DEMO_DERIVATIONS)(
  '$title pins a verified, finished catalog-2 reference',
  ({ definition }) => {
    expect(definition).toMatchObject({
      ruleCatalogVersion: 2,
      formulaGroupingVersion: 1,
      referenceProof: { proofVersion: 2 },
    });
    const input = {
      problem: {
        ruleCatalogVersion: definition.ruleCatalogVersion,
        formulaGroupingVersion: definition.formulaGroupingVersion,
        premises: definition.premises,
        conclusion: definition.conclusion,
        permittedRuleIds: definition.rules.map((rule) => rule.id),
      },
      proof: definition.referenceProof,
    };
    const check = definition.format === 'fitch' ? checkFitchProof : checkDependencyProof;
    const finished =
      definition.format === 'fitch'
        ? isFinishedFitchProofAttempt
        : isFinishedDependencyProofAttempt;
    expect(check(input).status).toBe('accepted');
    expect(finished(input)).toBe(true);
  },
);
