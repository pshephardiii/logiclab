import type { ConceptualProblemDefinition, ProblemDefinition } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import {
  conceptualQuestionDefinitionSchema,
  type ConceptualQuestionDefinition,
} from '@logiclab/contracts';
import {
  requireTruthTableDefinition,
  UnsupportedProblemDefinitionError,
} from './definition-support';
import { mapProblemError } from '../../routes/problem/errors';
import { mapAssignmentError } from '../../routes/assignment/errors';
import { mapStudentWorkError } from '../../routes/studentWork/errors';

const truth = { type: 'truth_table', definitionVersion: 1, formula: '~P <-> Q' } as const;
const definition: ConceptualQuestionDefinition = {
  type: 'true_false',
  definitionVersion: 1,
  question: 'A tautology is always true.',
  correctAnswer: true,
  explanation: 'Private explanation.',
};

test('persisted and transport conceptual shapes are mutually assignable and round-trip unchanged', () => {
  const stored: ConceptualProblemDefinition = conceptualQuestionDefinitionSchema.parse(definition);
  const transported: ConceptualQuestionDefinition = stored;
  expect(conceptualQuestionDefinitionSchema.parse(JSON.parse(JSON.stringify(transported)))).toEqual(
    definition,
  );
});

test('formula-only dispatch retains truth-table data and rejects conceptual or unknown versions', () => {
  expect(requireTruthTableDefinition(truth)).toBe(truth);
  expect(() => requireTruthTableDefinition(definition)).toThrow(UnsupportedProblemDefinitionError);
  expect(() =>
    requireTruthTableDefinition({ ...truth, definitionVersion: 2 } as unknown as ProblemDefinition),
  ).toThrow(UnsupportedProblemDefinitionError);
});

test.each([mapProblemError, mapAssignmentError, mapStudentWorkError])(
  'unsupported content maps consistently without leaking instructor keys',
  (map) => {
    const error = Object.assign(new UnsupportedProblemDefinitionError(), { definition });
    expect(map(error)).toEqual({
      status: 409,
      code: 'PROBLEM_DEFINITION_UNSUPPORTED',
      message: 'This problem definition is not supported by this workflow yet.',
    });
  },
);
