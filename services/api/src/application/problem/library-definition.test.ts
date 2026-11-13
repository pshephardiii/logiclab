import { ProofMethodUnavailableError } from '../proof/availability';
import { naturalDeductionTreeDefinitionFixture } from '../../../test/derivation-fixture';
import { dependencyDefinitionFixture } from '../../../test/derivation-fixture';
import {
  assignmentAdmissionDefinition,
  supportedAssignmentDefinition,
} from '../assignment/definition-support';
import { DerivationPublicationError, DerivationAuthoringError } from './derivation/errors';
import {
  createLibraryProblemRequestSchema,
  updateLibraryProblemRequestSchema,
} from '@logiclab/contracts/problem-library';
import { derivationDefinitionFixture as definition } from '../../../test/derivation-fixture';
import {
  authoringDefinition,
  libraryProblemDefinition,
  publicationDefinition,
} from './library-definition';
import { mapProblemError } from '../../routes/problem/errors';

import { validateObjectiveDefinition } from './definition-support';

test('owner definitions accept incomplete derivations while assignment admission stays closed', () => {
  const value = { ...definition(), referenceProof: null, conclusion: '' };
  expect(libraryProblemDefinition(value)).toEqual(value);
  expect(
    createLibraryProblemRequestSchema.parse({ title: '  Draft  ', definition: value }).title,
  ).toBe('Draft');
  expect(updateLibraryProblemRequestSchema.safeParse({}).success).toBe(false);
  expect(updateLibraryProblemRequestSchema.safeParse({ referenceAccepted: true }).success).toBe(
    false,
  );
  expect(() => validateObjectiveDefinition(value)).toThrow();
});

test('publication checks the exact saved configuration without trusting an old result', () => {
  const value = definition();
  expect(publicationDefinition(value)).toEqual(value);
  expect(() => publicationDefinition({ ...value, referenceProof: null })).toThrow(
    DerivationPublicationError,
  );
  expect(() => publicationDefinition({ ...value, rules: [] })).toThrow(DerivationPublicationError);
  expect(() => publicationDefinition({ ...value, conclusion: 'Q' })).toThrow(
    DerivationPublicationError,
  );
  expect(() => publicationDefinition({ ...value, conclusion: 'P &' })).toThrow(
    DerivationPublicationError,
  );
  expect(() => publicationDefinition({ ...value, referenceAccepted: true })).toThrow(
    DerivationAuthoringError,
  );
});

test('existing truth-table and conceptual publication checks retain their behavior', () => {
  const table = { type: 'truth_table', definitionVersion: 1, formula: 'P' };
  const question = {
    type: 'true_false',
    definitionVersion: 1,
    question: 'Always?',
    correctAnswer: false,
  };
  expect(publicationDefinition(table)).toEqual(table);
  expect(publicationDefinition(question)).toEqual(question);
  expect(() => publicationDefinition({ ...table, formula: 'P &' })).toThrow();
});

test.each([
  [new DerivationPublicationError('missing_reference'), 409, 'DERIVATION_REFERENCE_REQUIRED'],
  [new DerivationPublicationError('rejected_reference'), 409, 'DERIVATION_REFERENCE_NOT_ACCEPTED'],
  [new DerivationAuthoringError('invalid_definition'), 400, 'DERIVATION_DEFINITION_INVALID'],
  [new DerivationAuthoringError('unknown_rule'), 400, 'DERIVATION_RULE_UNSUPPORTED'],
  [new DerivationAuthoringError('reference_unavailable'), 409, 'DERIVATION_REFERENCE_UNAVAILABLE'],
])('owner errors have actionable safe mappings: %#', (error, status, code) => {
  const result = mapProblemError(Object.assign(error, { privateReference: 'SECRET_REFERENCE' }));
  expect(result).toMatchObject({ status, code });
  expect(JSON.stringify(result)).not.toContain('SECRET_REFERENCE');
});

test.each(['graded', 'completion_only', 'ungraded_practice'])(
  'published dependency definitions support %s assignment admission under the shared policy',
  (assessmentMode) => {
    const value = dependencyDefinitionFixture();
    expect(publicationDefinition(value)).toEqual(value);
    expect(
      supportedAssignmentDefinition(value, {
        assessmentMode,
        feedbackTiming: assessmentMode === 'ungraded_practice' ? 'on_check' : 'on_submission',
      }),
    ).toEqual(value);
  },
);

test('new authoring and publication reject unavailable tree work while retained validation still accepts it', () => {
  const value = naturalDeductionTreeDefinitionFixture();
  expect(libraryProblemDefinition(value)).toEqual(value);
  expect(() => authoringDefinition(value)).toThrow(ProofMethodUnavailableError);
  expect(() => publicationDefinition(value)).toThrow(ProofMethodUnavailableError);
  expect(authoringDefinition(definition())).toEqual(definition());
  expect(authoringDefinition(dependencyDefinitionFixture())).toEqual(dependencyDefinitionFixture());
});

test.each(['graded', 'completion_only', 'ungraded_practice'])(
  'new %s assignments reject tree versions without changing historical projection support',
  (assessmentMode) => {
    const value = naturalDeductionTreeDefinitionFixture();
    const policy = {
      assessmentMode,
      feedbackTiming: assessmentMode === 'ungraded_practice' ? 'on_check' : 'on_submission',
    };
    expect(supportedAssignmentDefinition(value, policy)).toEqual(value);
    expect(() => assignmentAdmissionDefinition(value, policy)).toThrow(ProofMethodUnavailableError);
    expect(assignmentAdmissionDefinition(definition(), policy)).toEqual(definition());
    expect(assignmentAdmissionDefinition(dependencyDefinitionFixture(), policy)).toEqual(
      dependencyDefinitionFixture(),
    );
  },
);
