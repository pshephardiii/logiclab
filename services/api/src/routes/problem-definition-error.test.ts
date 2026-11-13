import { ProofMethodUnavailableError } from '../application/proof/availability';
import { UnsupportedProblemDefinitionError } from '../application/problem/definition-support';
import { mapProblemDefinitionError } from './problem-definition-error';
import { mapProblemError } from './problem/errors';
import { mapAssignmentError } from './assignment/errors';
import { mapStudentWorkError } from './studentWork/errors';

test.each([mapProblemDefinitionError, mapProblemError, mapAssignmentError, mapStudentWorkError])(
  'resource error mapping consistently reports an unavailable method without private details: %#',
  (map) => {
    const error = Object.assign(new ProofMethodUnavailableError(), {
      message: 'PRIVATE_REFERENCE',
      referenceProof: 'SECRET_KEY',
    });
    expect(map(error)).toEqual({
      status: 409,
      code: 'PROOF_METHOD_UNAVAILABLE',
      message: 'This proof method is unavailable for new work.',
    });
  },
);

test('unsupported stored definitions and unrelated errors keep their existing classification', () => {
  expect(mapProblemDefinitionError(new UnsupportedProblemDefinitionError())).toMatchObject({
    status: 409,
    code: 'PROBLEM_DEFINITION_UNSUPPORTED',
  });
  expect(mapProblemDefinitionError(new Error('other'))).toBeUndefined();
});
