import { startFitchProof } from '../../../features/proof/helpers/fitch-editor';
import { startDependencyProof } from '../../../features/proof/dependency/editor';
import { startNaturalDeductionTreeProof } from '../../../features/proof/natural-deduction-tree/editor';
import type { PracticeStatement, PracticeProof } from './practice-proof';

/** Initialize entries once; beginning practice never checks or searches for a proof. */
export function startPracticeProof(statement: PracticeStatement): PracticeProof {
  if (statement.format === 'tree') return startNaturalDeductionTreeProof(statement.conclusion);
  if (statement.format === 'dependency') return startDependencyProof(statement.premises);
  return startFitchProof(statement);
}
