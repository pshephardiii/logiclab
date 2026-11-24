import { blankDerivationAnswer } from '../helpers/proof-answers';
import { ProblemType } from '@logiclab/contracts/problem-type';
import type {
  SavedStudentAssignment,
  SavedDerivationAnswer as DerivationAnswer,
} from '@logiclab/contracts/saved-student-work';
import { DependencyProofEditor } from '../../proof/dependency/DependencyProofEditor';
import { NaturalDeductionTreeProofEditor } from '../../proof/natural-deduction-tree/NaturalDeductionTreeProofEditor';
import { FitchProofEditor } from '../../proof/components/FitchProofEditor';

type Item = Extract<
  SavedStudentAssignment['items'][number],
  { content: { type: typeof ProblemType.Derivation } }
>;

/** Select the pinned format; permissions and feedback remain with the assigned panel. */
export function AssignedDerivationEditor({
  statement,
  proof,
  readOnly,
  disabled,
  onAnswer,
  onPendingChange,
}: {
  statement: Item['content'];
  proof: DerivationAnswer['proof'] | null;
  readOnly: boolean;
  disabled: boolean;
  onAnswer: (answer: DerivationAnswer) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  return (
    <>
      {statement.format === 'tree' ? (
        <NaturalDeductionTreeProofEditor
          onPendingChange={onPendingChange}
          statement={statement}
          proof={proof?.format === 'tree' ? proof : null}
          purpose="student"
          onChange={(next) => {
            if (!readOnly && !disabled)
              onAnswer(
                next
                  ? { type: ProblemType.Derivation, proof: next }
                  : blankDerivationAnswer(statement.format, statement.ruleCatalogVersion),
              );
          }}
        />
      ) : statement.format === 'dependency' ? (
        <DependencyProofEditor
          onPendingChange={onPendingChange}
          statement={statement}
          proof={proof?.format === 'dependency' ? proof : null}
          purpose="student"
          onChange={(next) => {
            if (!readOnly && !disabled)
              onAnswer(
                next
                  ? { type: ProblemType.Derivation, proof: next }
                  : blankDerivationAnswer(statement.format, statement.ruleCatalogVersion),
              );
          }}
        />
      ) : (
        <FitchProofEditor
          onPendingChange={onPendingChange}
          statement={statement}
          proof={proof?.format === 'fitch' ? proof : null}
          purpose="student"
          onChange={(next) => {
            if (!readOnly && !disabled)
              onAnswer(
                next
                  ? { type: ProblemType.Derivation, proof: next }
                  : blankDerivationAnswer(statement.format, statement.ruleCatalogVersion),
              );
          }}
        />
      )}
    </>
  );
}
