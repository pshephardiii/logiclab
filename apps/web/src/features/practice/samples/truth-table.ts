import { generateTruthTable } from '@logiclab/logic-engine';
import { sampleStage } from './stage';

/** Use the normal engine's IDs/values; loading the editable table will still use its existing API. */
export function createTruthTableSample() {
  const formula = '(P ∧ Q) → P';
  const completed = generateTruthTable(formula);
  const answerColumns = completed.columns.filter((column) => column.kind === 'answer');
  const revealedColumnIds: string[] = [];
  const stages = [
    sampleStage(
      'P means “it is raining”; Q means “it is cold”. The given columns cover every combination of true and false.',
      { revealedColumnIds },
    ),
  ];

  revealedColumnIds.push(answerColumns[0]!.id);
  stages.push(sampleStage('P ∧ Q is true only when both P and Q are true.', { revealedColumnIds }));

  revealedColumnIds.push(answerColumns[1]!.id);
  stages.push(
    sampleStage(
      'The conditional is false only if its left side is true and its right side false. That never happens here: when P ∧ Q is true, P is already true.',
      { revealedColumnIds },
    ),
  );

  return {
    id: 'rain-and-cold-table',
    title: 'If it is raining and cold, then it is raining',
    formula,
    formulaGroupingVersion: 1 as const,
    stages,
    completed,
  };
}
