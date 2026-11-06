import {
  conceptualSolutionSchema,
  objectiveAssignmentResponseValueSchema,
  truthTableSolutionResponseSchema,
  type ObjectiveProblemDefinition,
  type ObjectiveAssignmentResponseValue,
  type TruthTableAnswer,
  type TruthTableCheckResponse,
  type TruthTableSolutionResponse,
  type ConceptualFeedback,
  type ConceptualSolution,
} from '@logiclab/contracts';
import { generateTruthTable } from '@logiclab/logic-engine';
import { validateObjectiveDefinition } from '../problem/definition-support';
import { validateTruthTableAnswers, checkAssignedTruthTableAnswers } from './evaluation';
import { validateConceptualAnswer, checkConceptualAnswer } from './conceptual-evaluation';
import { StudentWorkError } from './errors';

type TableDefinition = Extract<ObjectiveProblemDefinition, { type: 'truth_table' }>;

function tableResponse(input: unknown): TruthTableAnswer[] {
  const parsed = objectiveAssignmentResponseValueSchema.safeParse(input);

  if (!parsed.success || !Array.isArray(parsed.data)) throw new StudentWorkError('invalid_answer');

  return parsed.data;
}

export function validateObjectiveResponse(
  definition: TableDefinition,
  input: unknown,
): TruthTableAnswer[];

export function validateObjectiveResponse(
  definition: ObjectiveProblemDefinition,
  input: unknown,
): ObjectiveAssignmentResponseValue;

/** Validate saves without evaluating correctness; return an independently parsed response. */
export function validateObjectiveResponse(
  definition: ObjectiveProblemDefinition,
  input: unknown,
): ObjectiveAssignmentResponseValue {
  const supported = validateObjectiveDefinition(definition);

  if (supported.type !== 'truth_table') return validateConceptualAnswer(supported, input);

  const answers = tableResponse(input);

  validateTruthTableAnswers(supported.formula, answers);
  return answers;
}

export function checkObjectiveResponse(
  definition: TableDefinition,
  input: unknown,
): TruthTableCheckResponse;

export function checkObjectiveResponse(
  definition: ObjectiveProblemDefinition,
  input: unknown,
): TruthTableCheckResponse | ConceptualFeedback;

/** Caller must authorize checking; this function neither saves work nor reveals keys. */
export function checkObjectiveResponse(
  definition: ObjectiveProblemDefinition,
  input: unknown,
): TruthTableCheckResponse | ConceptualFeedback {
  const supported = validateObjectiveDefinition(definition);

  if (supported.type !== 'truth_table') return checkConceptualAnswer(supported, input);

  return checkAssignedTruthTableAnswers(supported.formula, tableResponse(input));
}

export function objectiveSolution(definition: TableDefinition): TruthTableSolutionResponse;

export function objectiveSolution(
  definition: ObjectiveProblemDefinition,
): TruthTableSolutionResponse | ConceptualSolution;

/** Privileged projection: call only after ownership/enrollment AND answer-release authorization. */
export function objectiveSolution(
  definition: ObjectiveProblemDefinition,
): TruthTableSolutionResponse | ConceptualSolution {
  const supported = validateObjectiveDefinition(definition);

  if (supported.type === 'truth_table')
    return truthTableSolutionResponseSchema.parse(generateTruthTable(supported.formula));

  return conceptualSolutionSchema.parse(
    supported.type === 'true_false'
      ? {
          type: supported.type,
          correctAnswer: supported.correctAnswer,
          explanation: supported.explanation ?? null,
        }
      : {
          type: supported.type,
          correctOptionId: supported.correctOptionId,
          explanation: supported.explanation ?? null,
        },
  );
}
