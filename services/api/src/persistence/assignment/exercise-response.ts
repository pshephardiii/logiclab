import { conceptualQuestionContent } from '../../application/problem/conceptual-content';
import { supportedProblemDefinition } from '../../application/problem/definition-support';
import type { Assignment, AssignmentItem } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { studentAssignmentSchema, type StudentAssignment } from '@logiclab/contracts';
import type { SavedStudentAssignment } from '@logiclab/contracts/saved-student-work';
import { derivationContent } from '../../application/problem/derivation-authoring';
import { StudentWorkError } from '../../application/student-work/errors';
import { generateTruthTable } from '@logiclab/logic-engine';
import { exerciseResponse } from '../../application/truth-table/exercise';
import { assignmentSummary } from './summary';

/** Shape pinned assignment content for work/review tables without embedding solutions. */
export function savedAssignmentExercises(
  assignment: Assignment,
  items: AssignmentItem[],
): SavedStudentAssignment {
  return {
    ...assignmentSummary(assignment),
    items: items.map((item) => {
      const stored = item.problemVersion.definition;
      if (stored.type === 'derivation' && assignment.assessmentMode === 'completion_only')
        throw new StudentWorkError('unsupported_policy');
      const definition =
        stored.type === 'derivation'
          ? derivationContent(stored)
          : supportedProblemDefinition(stored);
      const common = {
        id: item.id,
        position: item.position,
        ...(assignment.assessmentMode === 'graded' ? { maxPoints: item.maxPoints } : {}),
        title: item.problemVersion.title,
        instructions: item.problemVersion.instructions ?? null,
      };
      if (definition.type === 'derivation') return { ...common, content: definition };
      return definition.type === 'truth_table'
        ? {
            ...common,
            formula: definition.formula,
            exercise: exerciseResponse(generateTruthTable(definition.formula)),
          }
        : { ...common, content: conceptualQuestionContent(definition) };
    }),
  };
}

/** Narrow active/instructor response until staged proof work is ready for those consumers. */
export function assignmentExercises(
  assignment: Assignment,
  items: AssignmentItem[],
): StudentAssignment {
  return studentAssignmentSchema.parse(savedAssignmentExercises(assignment, items));
}
