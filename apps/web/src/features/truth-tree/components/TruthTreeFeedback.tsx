import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
import { unexpectedFormulaCharacter } from '../helpers/formula-presentation';
import { FormulaCharacterIssue } from './FormulaCharacterIssue';
import { terminalBranchNumbers } from '../helpers/display-labels';
import { editableTree } from '../helpers/construction';
import type { TruthTree, TruthTreeCheckReport } from '@logiclab/contracts/truth-tree';
import {
  TruthTreeVerdictStatus,
  type TruthTreeVerdictAssessment,
} from '@logiclab/contracts/truth-tree-work';

/** Authoritative or explicitly requested local diagnostics; this component does not run the checker. */
export function TruthTreeFeedback({
  report,
  tree,
  verdict,
  showArgument = true,
}: {
  report: TruthTreeCheckReport;
  tree?: TruthTree | null;
  verdict?: TruthTreeVerdictAssessment | null;
  showArgument?: boolean;
}) {
  const structure = tree ? editableTree(tree) : null;
  const numbers = structure ? terminalBranchNumbers(structure) : new Map<string, number>();
  const incorrect =
    report.status === 'invalid' || verdict?.status === TruthTreeVerdictStatus.Incorrect;
  const complete =
    report.status === 'verified' && (!verdict || verdict.status === TruthTreeVerdictStatus.Correct);
  const tone = incorrect ? 'error' : complete ? 'success' : 'pending';
  const heading = incorrect
    ? 'A little more work needed'
    : complete
      ? 'Nicely done!'
      : 'Keep going';
  const pathLabels = {
    closed: 'Closed',
    open_complete: 'Open and fully decomposed',
    incomplete: 'Needs decomposition',
    needs_closure: 'Needs closure',
  };

  return (
    <section
      aria-label="Truth-tree feedback"
      className={`truth-tree-feedback truth-tree-feedback--${tone}`}
    >
      <h3>
        {complete && <span aria-hidden="true">✓</span>} {heading}
      </h3>
      <p role="status">
        Tree check: {report.status}.{showArgument && ` Argument: ${report.argumentStatus}.`}
      </p>
      {verdict && (
        <p role="status">
          Validity verdict:{' '}
          {verdict.status === TruthTreeVerdictStatus.Correct
            ? 'correct.'
            : verdict.status === TruthTreeVerdictStatus.Incorrect
              ? 'incorrect.'
              : verdict.status === TruthTreeVerdictStatus.Unanswered
                ? 'not answered. Choose Valid or Invalid and check again.'
                : 'cannot be assessed until the tree establishes an outcome.'}
        </p>
      )}
      {report.branches.length > 0 && (
        <ul className="truth-tree-path-results">
          {report.branches.map((branch, index) => (
            <li key={branch.branchId}>
              Branch {numbers.get(branch.branchId) ?? index + 1}: {pathLabels[branch.status]}.
            </li>
          ))}
        </ul>
      )}
      {showArgument && report.counterexample && (
        <p>
          Counterexample:{' '}
          {Object.entries(report.counterexample.assignment)
            .map(([name, value]) => `${name} = ${value ? 'T' : 'F'}`)
            .join(', ')}
        </p>
      )}
      <ul>
        {[...report.steps.diagnostics, ...report.diagnostics].map((diagnostic, index) => {
          const formulaIndex =
            tree?.occurrences.findIndex((item) => item.id === diagnostic.occurrenceId) ?? -1;
          const issue =
            diagnostic.code === CheckerDiagnosticCode.InvalidFormula && formulaIndex >= 0
              ? unexpectedFormulaCharacter(tree!.occurrences[formulaIndex]!.formula)
              : null;
          return (
            <li key={index}>
              {issue ? (
                <FormulaCharacterIssue label={`Formula ${formulaIndex + 1}`} {...issue} />
              ) : (
                diagnostic.message
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
