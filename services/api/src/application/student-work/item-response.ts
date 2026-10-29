import {
  conceptualSolutionSchema,
  assignmentResponseValueSchema,
  truthTableSolutionResponseSchema,
  type ProblemDefinition,
  type AssignmentResponseValue,
  type TruthTableAnswer,
  type TruthTableCheckResponse,
  type TruthTableSolutionResponse,
  type ConceptualFeedback,
  type ConceptualSolution,
} from '@logiclab/contracts';
import { generateTruthTable } from '@logiclab/logic-engine';
import { supportedProblemDefinition } from '../problem/definition-support';
import { validateAnswers, checkAssignedAnswers } from './evaluation';
import { validateConceptualAnswer, checkConceptualAnswer } from './conceptual-evaluation';
import { StudentWorkError } from './errors';

type TableDefinition = Extract<ProblemDefinition, { type: 'truth_table' }>;

function tableResponse(input: unknown): TruthTableAnswer[] {
  const parsed = assignmentResponseValueSchema.safeParse(input);
  if (!parsed.success || !Array.isArray(parsed.data)) throw new StudentWorkError('invalid_answer');
  return parsed.data;
}

export function validateItemResponse(
  definition: TableDefinition,
  input: unknown,
): TruthTableAnswer[];
export function validateItemResponse(
  definition: ProblemDefinition,
  input: unknown,
): AssignmentResponseValue;
/** Validate saves without evaluating correctness; return an independently parsed response. */
export function validateItemResponse(
  definition: ProblemDefinition,
  input: unknown,
): AssignmentResponseValue {
  const supported = supportedProblemDefinition(definition);
  if (supported.type !== 'truth_table') return validateConceptualAnswer(supported, input);
  const answers = tableResponse(input);
  validateAnswers(supported.formula, answers);
  return answers;
}

export function checkItemResponse(
  definition: TableDefinition,
  input: unknown,
): TruthTableCheckResponse;
export function checkItemResponse(
  definition: ProblemDefinition,
  input: unknown,
): TruthTableCheckResponse | ConceptualFeedback;
/** Caller must authorize checking; this function neither saves work nor reveals keys. */
export function checkItemResponse(
  definition: ProblemDefinition,
  input: unknown,
): TruthTableCheckResponse | ConceptualFeedback {
  const supported = supportedProblemDefinition(definition);
  if (supported.type !== 'truth_table') return checkConceptualAnswer(supported, input);
  return checkAssignedAnswers(supported.formula, tableResponse(input));
}

export function itemSolution(definition: TableDefinition): TruthTableSolutionResponse;
export function itemSolution(
  definition: ProblemDefinition,
): TruthTableSolutionResponse | ConceptualSolution;
/** Privileged projection: call only after ownership/enrollment AND answer-release authorization. */
export function itemSolution(
  definition: ProblemDefinition,
): TruthTableSolutionResponse | ConceptualSolution {
  const supported = supportedProblemDefinition(definition);
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
