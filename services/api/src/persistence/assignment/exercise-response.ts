import type { Assignment, AssignmentItem } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { StudentAssignment } from '@logiclab/contracts';
import { generateTruthTable } from '@logiclab/logic-engine';
import { exerciseResponse } from '../../application/truth-table/exercise';
import { assignmentSummary } from './summary';

/** Shape pinned assignment content for work/review tables without embedding solutions. */
export function assignmentExercises(
  assignment: Assignment,
  items: AssignmentItem[],
): StudentAssignment {
  return {
    ...assignmentSummary(assignment),
    items: items.map((item) => ({
      id: item.id,
      position: item.position,
      title: item.problemVersion.title,
      instructions: item.problemVersion.instructions ?? null,
      formula: item.problemVersion.definition.formula,
      exercise: exerciseResponse(generateTruthTable(item.problemVersion.definition.formula)),
    })),
  };
}
