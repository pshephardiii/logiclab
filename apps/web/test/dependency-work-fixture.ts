import type { SavedStudentAssignment } from '@logiclab/contracts/saved-student-work';
import type { DependencyDerivationAnswer } from '@logiclab/contracts/dependency-derivation-work';
import { proofAnswer, proofWork, proofSaved, proofReport } from './proof-work-fixture';
export { itemA, itemB } from './proof-work-fixture';
const step = proofAnswer.proof.steps[0]!;
export const dependencyAnswer: DependencyDerivationAnswer = {
  type: 'derivation',
  proof: {
    proofVersion: 1,
    format: 'dependency',
    steps: [
      {
        kind: 'premise',
        id: step.id,
        formula: step.formula,
        premiseId: step.kind === 'premise' ? step.premiseId : null,
        dependencies: [step.id],
      },
    ],
  },
};
export const dependencyWork: SavedStudentAssignment = {
  ...proofWork,
  items: proofWork.items.map((item) =>
    'content' in item && item.content.type === 'derivation'
      ? { ...item, content: { ...item.content, format: 'dependency' } }
      : item,
  ),
};
export const dependencySaved = {
  ...proofSaved,
  answers: { [proofWork.items[0]!.id]: dependencyAnswer },
};
export const dependencyChecked = {
  itemId: proofWork.items[0]!.id,
  feedback: { type: 'derivation' as const, report: proofReport },
};
