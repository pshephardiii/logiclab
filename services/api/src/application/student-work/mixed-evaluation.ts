import {
  objectiveAssignmentResponsesSchema,
  objectiveGradedSubmissionResultSchema,
  objectiveCompletionSubmissionResultSchema,
  type ObjectiveAssignmentResponses,
  type ObjectiveAssignmentResponseValue,
  type ObjectiveProblemDefinition,
  type TruthTableAnswer,
  type ObjectiveGradedSubmissionResult,
  type ObjectiveCompletionSubmissionResult,
  type TruthTableGradedSubmissionResult,
  type TruthTableCompletionSubmissionResult,
} from '@logiclab/contracts';
import { validateObjectiveDefinition } from '../problem/definition-support';
import {
  validateTruthTableAnswers,
  checkAssignedTruthTableAnswers,
  evaluateTruthTableSubmission,
  evaluateTruthTableCompletion,
} from './evaluation';
import {
  checkConceptualAnswer,
  validateConceptualAnswer,
  conceptualAnswerIsFilled,
} from './conceptual-evaluation';
import { StudentWorkError } from './errors';

type AssignedObjectiveDefinition = { id: string; definition: ObjectiveProblemDefinition };

function validatedWork(items: AssignedObjectiveDefinition[], input: unknown) {
  if (
    !items.length ||
    items.length > 50 ||
    new Set(items.map((item) => item.id)).size !== items.length
  )
    throw new StudentWorkError('invalid_answer');

  const parsed = objectiveAssignmentResponsesSchema.safeParse(input);

  if (
    !parsed.success ||
    Object.keys(parsed.data).some((id) => !items.some((item) => item.id === id))
  )
    throw new StudentWorkError('invalid_answer');

  return {
    items: items.map((item) => ({
      ...item,
      definition: validateObjectiveDefinition(item.definition),
    })),
    responses: parsed.data,
  };
}

function responseFor(
  item: AssignedObjectiveDefinition,
  responses: ObjectiveAssignmentResponses,
): ObjectiveAssignmentResponseValue {
  if (Object.hasOwn(responses, item.id)) return responses[item.id]!;

  switch (item.definition.type) {
    case 'truth_table':
      return [];
    case 'true_false':
      return { type: 'true_false', answer: null };
    case 'multiple_choice':
      return { type: 'multiple_choice', optionId: null };
  }
}

function tableAnswers(response: ObjectiveAssignmentResponseValue): TruthTableAnswer[] {
  if (!Array.isArray(response)) throw new StudentWorkError('invalid_answer');

  return response;
}

/** Preserve the legacy stored formats for assignments containing only truth tables. */
function truthTableOnlyWork(
  items: AssignedObjectiveDefinition[],
  responses: ObjectiveAssignmentResponses,
) {
  return {
    items: items.map((item) => {
      if (item.definition.type !== 'truth_table') throw new StudentWorkError('invalid_answer');

      return { id: item.id, formula: item.definition.formula };
    }),
    answers: Object.fromEntries(
      items.map((item) => [item.id, tableAnswers(responseFor(item, responses))]),
    ),
  };
}

/** Each table cell or conceptual question contributes one unweighted response unit. */
export function evaluateObjectiveSubmission(
  items: AssignedObjectiveDefinition[],
  input: unknown,
): TruthTableGradedSubmissionResult | ObjectiveGradedSubmissionResult {
  const work = validatedWork(items, input);

  if (work.items.every((item) => item.definition.type === 'truth_table')) {
    const tableWork = truthTableOnlyWork(work.items, work.responses);

    return evaluateTruthTableSubmission(tableWork.items, tableWork.answers);
  }

  const summary = { correct: 0, incorrect: 0, unanswered: 0, total: 0 };

  const results = work.items.map((item) => {
    const answer = responseFor(item, work.responses);

    if (item.definition.type === 'truth_table') {
      const feedback = checkAssignedTruthTableAnswers(
        item.definition.formula,
        tableAnswers(answer),
      );

      summary.correct += feedback.summary.correct;
      summary.incorrect += feedback.summary.incorrect;
      summary.unanswered += feedback.summary.unanswered;
      summary.total += feedback.summary.total;
      return { type: 'truth_table' as const, itemId: item.id, feedback };
    }

    const feedback = checkConceptualAnswer(item.definition, answer);

    summary[feedback.status]++;
    summary.total++;
    return { type: item.definition.type, itemId: item.id, feedback };
  });

  return objectiveGradedSubmissionResultSchema.parse({
    gradingVersion: 'mixed_v1',
    items: results,
    summary,
  });
}

/** Completion validates and counts answers without comparing conceptual answers with keys. */
export function evaluateObjectiveCompletion(
  items: AssignedObjectiveDefinition[],
  input: unknown,
): TruthTableCompletionSubmissionResult | ObjectiveCompletionSubmissionResult {
  const work = validatedWork(items, input);

  if (work.items.every((item) => item.definition.type === 'truth_table')) {
    const tableWork = truthTableOnlyWork(work.items, work.responses);

    return evaluateTruthTableCompletion(tableWork.items, tableWork.answers);
  }

  const completed = work.items.map((item) => {
    const response = responseFor(item, work.responses);
    let totalResponses: number;
    let completedResponses: number;

    if (item.definition.type === 'truth_table') {
      const validated = validateTruthTableAnswers(item.definition.formula, tableAnswers(response));
      totalResponses = validated.table.rows.length * validated.columns.length;
      completedResponses = [...validated.answers.values()].filter((value) => value !== null).length;
    } else {
      const answer = validateConceptualAnswer(item.definition, response);
      totalResponses = 1;
      completedResponses = conceptualAnswerIsFilled(answer) ? 1 : 0;
    }

    if (completedResponses !== totalResponses) throw new StudentWorkError('incomplete_work');

    return { itemId: item.id, type: item.definition.type, completedResponses, totalResponses };
  });

  const summary = completed.reduce(
    (total, item) => ({
      completedResponses: total.completedResponses + item.completedResponses,
      totalResponses: total.totalResponses + item.totalResponses,
    }),
    { completedResponses: 0, totalResponses: 0 },
  );

  return objectiveCompletionSubmissionResultSchema.parse({
    gradingVersion: 'mixed_completion_v1',
    items: completed,
    summary,
  });
}
