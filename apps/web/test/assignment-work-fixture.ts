import type {
  StudentAssignment,
  StudentAttempt,
  SubmissionReview,
  TruthTableExerciseResponse,
  TruthTableSolutionResponse,
} from '@logiclab/contracts';
export const itemA = 'a1111111-1111-4111-8111-111111111111';
export const itemB = 'a2222222-2222-4222-8222-222222222222';
export const exercise: TruthTableExerciseResponse = {
  variables: ['P'],
  columns: [
    { id: 'var:v1:P', label: 'P', kind: 'given', isFinal: false },
    { id: 'expr:v1:P', label: 'P', kind: 'answer', isFinal: true },
  ],
  rows: [
    { id: 'r1', values: { 'var:v1:P': true } },
    { id: 'r2', values: { 'var:v1:P': false } },
  ],
};
export const solution: TruthTableSolutionResponse = {
  ...exercise,
  rows: exercise.rows.map((row, index) => ({
    ...row,
    values: { ...row.values, 'expr:v1:P': index === 0 },
  })),
};
export const work: StudentAssignment = {
  id: 'a3333333-3333-4333-8333-333333333333',
  classId: 'a4444444-4444-4444-8444-444444444444',
  title: 'Assigned logic',
  instructions: 'Complete both occurrences.',
  assessmentMode: 'graded',
  feedbackTiming: 'on_submission',
  allowSolutions: false,
  publishedAt: '2026-10-16T12:00:00.000Z',
  archivedAt: null,
  createdAt: '2026-10-16T12:00:00.000Z',
  updatedAt: '2026-10-16T12:00:00.000Z',
  items: [
    {
      id: itemA,
      position: 1,
      title: 'First occurrence',
      instructions: null,
      formula: 'P',
      exercise,
    },
    {
      id: itemB,
      position: 2,
      title: 'Second occurrence',
      instructions: null,
      formula: 'P',
      exercise,
    },
  ],
};
export const saved: StudentAttempt = {
  id: 'a5555555-5555-4555-8555-555555555555',
  revision: 1,
  answers: {
    [itemA]: [
      { rowId: 'r1', columnId: 'expr:v1:P', value: false },
      { rowId: 'r2', columnId: 'expr:v1:P', value: null },
    ],
  },
  submittedAt: null,
  result: null,
};
export const submitted: StudentAttempt = {
  ...saved,
  revision: 2,
  submittedAt: '2026-10-16T13:00:00.000Z',
  result: {
    gradingVersion: 'truth_table_v1',
    items: work.items.map((item, index) => ({
      itemId: item.id,
      feedback: {
        cells: [
          { rowId: 'r1', columnId: 'expr:v1:P', status: index === 0 ? 'incorrect' : 'unanswered' },
          { rowId: 'r2', columnId: 'expr:v1:P', status: 'unanswered' },
        ],
        summary: {
          correct: 0,
          incorrect: index === 0 ? 1 : 0,
          unanswered: index === 0 ? 1 : 2,
          total: 2,
        },
      },
    })),
    summary: { correct: 0, incorrect: 1, unanswered: 3, total: 4 },
  },
};
export const review: SubmissionReview = {
  submission: {
    id: submitted.id,
    student: { id: 'a6666666-6666-4666-8666-666666666666', email: 'student@example.test' },
    submittedAt: submitted.submittedAt!,
    summary: submitted.result!.summary,
  },
  assignment: work,
  attempt: submitted,
};
