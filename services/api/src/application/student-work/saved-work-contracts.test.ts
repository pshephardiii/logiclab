import { evaluateFitchAnswer } from './derivation-response';
import type {
  AttemptAnswers,
  FitchDerivationAnswer as StoredProof,
  FitchProof as StoredFitch,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { FitchProof } from '@logiclab/contracts';
import {
  studentAssignmentResponseSchema,
  studentAttemptSchema,
  saveStudentAnswersSchema,
  checkStudentAnswersSchema,
  studentCheckResponseSchema,
  studentSolutionResponseSchema,
} from '@logiclab/contracts';
import type { FitchDerivationAnswer } from '@logiclab/contracts/derivation-work';
import {
  savedStudentAttemptSchema,
  savedStudentAssignmentResponseSchema,
  savedStudentAnswersSchema,
  savedStudentCheckSchema,
  savedStudentCheckResponseSchema,
  savedStudentSolutionResponseSchema,
  type SavedStudentResponses,
} from '@logiclab/contracts/saved-student-work';
import { derivationDefinitionFixture } from '../../../test/derivation-fixture';
import { fitchContent, fitchReferenceSolution } from '../problem/derivation/fitch/authoring';
import { detail, attempt } from '../../../test/student-work-fixture';

type Assert<T extends true> = T;
type ProofTransportMatches = Assert<
  StoredProof extends FitchDerivationAnswer
    ? FitchDerivationAnswer extends StoredProof
      ? true
      : false
    : false
>;
type ProofShapeMatches = Assert<
  StoredFitch extends FitchProof ? (FitchProof extends StoredFitch ? true : false) : false
>;
type SavedWorkMatches = Assert<
  AttemptAnswers extends SavedStudentResponses
    ? SavedStudentResponses extends AttemptAnswers
      ? true
      : false
    : false
>;
const id = 'a1111111-1111-4111-8111-111111111111';
const response: FitchDerivationAnswer = {
  type: 'derivation',
  proof: derivationDefinitionFixture().referenceProof!,
};

test('staged saved work round-trips proof JSON while live attempts/save requests stay guarded', () => {
  const saved = { ...attempt, answers: { [id]: response } };
  expect(savedStudentAttemptSchema.parse(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  expect(studentAttemptSchema.safeParse(saved).success).toBe(false);
  const input = { revision: 0, itemId: id, answers: response };
  expect(savedStudentAnswersSchema.safeParse(input).success).toBe(true);
  expect(saveStudentAnswersSchema.safeParse(input).success).toBe(false);
});

test('staged assigned proof content strictly excludes reference/solution fields and keeps live responses guarded', () => {
  const definition = derivationDefinitionFixture();
  const value = {
    assignment: {
      ...detail.assignment,
      assessmentMode: 'ungraded_practice',
      feedbackTiming: 'on_check',
      solutionAccess: 'never',
      items: [
        {
          id,
          position: 1,
          title: 'Proof',
          instructions: null,
          content: fitchContent(definition),
        },
      ],
    },
    attempt: null,
  };
  expect(savedStudentAssignmentResponseSchema.safeParse(value).success).toBe(true);
  expect(studentAssignmentResponseSchema.safeParse(value).success).toBe(false);
  expect(
    savedStudentAssignmentResponseSchema.safeParse({
      ...value,
      assignment: {
        ...value.assignment,
        items: [{ ...value.assignment.items[0], content: definition }],
      },
    }).success,
  ).toBe(false);
});

test('staged proof checks and solutions remain distinct, strict and excluded from live HTTP contracts', () => {
  const definition = derivationDefinitionFixture();
  const input = { itemId: id, answers: response };
  expect(savedStudentCheckSchema.safeParse(input).success).toBe(true);
  expect(savedStudentAnswersSchema.safeParse(input).success).toBe(false);
  expect(checkStudentAnswersSchema.safeParse(input).success).toBe(false);
  const evidence = evaluateFitchAnswer(
    { itemId: id, problemVersionId: id, content: fitchContent(definition) },
    response,
  );
  const check = { itemId: id, feedback: { type: 'derivation', report: evidence.report } };
  expect(savedStudentCheckResponseSchema.safeParse(check).success).toBe(true);
  expect(savedStudentAnswersSchema.safeParse(check).success).toBe(false);
  expect(studentCheckResponseSchema.safeParse(check).success).toBe(false);
  expect(
    savedStudentCheckResponseSchema.safeParse({
      ...check,
      feedback: { ...check.feedback, referenceProof: definition.referenceProof },
    }).success,
  ).toBe(false);
  const solution = { itemId: id, solution: fitchReferenceSolution(definition) };
  expect(savedStudentSolutionResponseSchema.safeParse(solution).success).toBe(true);
  expect(savedStudentAnswersSchema.safeParse(solution).success).toBe(false);
  expect(studentSolutionResponseSchema.safeParse(solution).success).toBe(false);
  expect(
    savedStudentSolutionResponseSchema.safeParse({
      ...solution,
      solution: { ...solution.solution, report: evidence.report },
    }).success,
  ).toBe(false);
});
