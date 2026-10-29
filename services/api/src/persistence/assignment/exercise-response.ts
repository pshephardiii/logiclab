import { conceptualQuestionContent } from '../../application/problem/conceptual-content';
import { supportedProblemDefinition } from '../../application/problem/definition-support';
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
    items: items.map((item) => {
      const definition = supportedProblemDefinition(item.problemVersion.definition);
      const common = {
        id: item.id,
        position: item.position,
        title: item.problemVersion.title,
        instructions: item.problemVersion.instructions ?? null,
      };
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
