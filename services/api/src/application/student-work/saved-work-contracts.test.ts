import type {
  AttemptAnswers,
  DerivationAnswer as StoredProof,
  FitchProof as StoredFitch,
} from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { FitchProof } from '@logiclab/contracts';
import {
  studentAssignmentResponseSchema,
  studentAttemptSchema,
  saveStudentAnswersSchema,
} from '@logiclab/contracts';
import type { DerivationAnswer } from '@logiclab/contracts/derivation-work';
import {
  savedStudentAttemptSchema,
  savedStudentAssignmentResponseSchema,
  savedStudentAnswersSchema,
  type SavedStudentResponses,
} from '@logiclab/contracts/saved-student-work';
import { derivationDefinitionFixture } from '../../../test/derivation-fixture';
import { derivationContent } from '../problem/derivation-authoring';
import { detail, attempt } from '../../../test/student-work-fixture';

type Assert<T extends true> = T;
type ProofTransportMatches = Assert<
  StoredProof extends DerivationAnswer
    ? DerivationAnswer extends StoredProof
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
const response: DerivationAnswer = {
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
          content: derivationContent(definition),
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
