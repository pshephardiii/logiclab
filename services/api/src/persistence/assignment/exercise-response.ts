import { ProblemType } from '@logiclab/contracts/problem-type';
import { conceptualQuestionContent } from '../../application/problem/conceptual-content';
import { validateObjectiveDefinition } from '../../application/problem/definition-support';
import type { Assignment, AssignmentItem } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { SavedStudentAssignment } from '@logiclab/contracts/saved-student-work';
import { publicDerivationContent } from '../../application/problem/derivation/projections';
import { assertProofWorkPolicy } from '../../application/student-work/proof-policy';
import { generateTruthTable } from '@logiclab/logic-engine';
import { exerciseResponse } from '../../application/truth-table/exercise';
import { assignmentSummary } from './summary';
import { truthTreeContent } from '../../application/problem/truth-tree/authoring';
import { assertTruthTreeWorkPolicy } from '../../application/student-work/truth-tree-policy';

/** Shape pinned assignment content for work/review tables without embedding solutions. */
export function savedAssignmentExercises(
  assignment: Assignment,
  items: AssignmentItem[],
): SavedStudentAssignment {
  return {
    ...assignmentSummary(assignment),
    items: items.map((item) => {
      const stored = item.problemVersion.definition;

      if (stored.type === ProblemType.TruthTree) {
        assertTruthTreeWorkPolicy(assignment);
        return {
          id: item.id,
          position: item.position,
          ...(assignment.assessmentMode === 'graded' ? { maxPoints: item.maxPoints } : {}),
          title: item.problemVersion.title,
          instructions: item.problemVersion.instructions ?? null,
          content: truthTreeContent(stored),
        };
      }

      if (stored.type === ProblemType.Derivation) assertProofWorkPolicy(assignment);

      const definition =
        stored.type === ProblemType.Derivation
          ? publicDerivationContent(stored)
          : validateObjectiveDefinition(stored);

      const common = {
        id: item.id,
        position: item.position,
        ...(assignment.assessmentMode === 'graded' ? { maxPoints: item.maxPoints } : {}),
        title: item.problemVersion.title,
        instructions: item.problemVersion.instructions ?? null,
      };

      if (definition.type === ProblemType.Derivation) return { ...common, content: definition };

      return definition.type === ProblemType.TruthTable
        ? {
            ...common,
            formula: definition.formula,
            exercise: exerciseResponse(generateTruthTable(definition.formula)),
          }
        : { ...common, content: conceptualQuestionContent(definition) };
    }),
  };
}
