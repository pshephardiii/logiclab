import { TruthTreeFeedback } from '../../truth-tree/components/TruthTreeFeedback';
import type { SavedStudentAssignment } from '@logiclab/contracts/saved-student-work';
import type { TruthTreeAnswer } from '@logiclab/contracts/truth-tree-work';
import type { TruthTreeSolution } from '@logiclab/contracts/truth-tree-authoring';
import type { TruthTreeCheckReport } from '@logiclab/contracts/truth-tree';
import { TruthTreeSummary } from '../../truth-tree/components/TruthTreeSummary';

/** Read-only saved-work compatibility while the truth-tree construction UI is staged. */
export function AssignedTruthTree({
  item,
  answer,
  solution,
  report,
}: {
  item: Extract<SavedStudentAssignment['items'][number], { content: { type: 'truth_tree' } }>;
  answer?: TruthTreeAnswer;
  solution?: TruthTreeSolution | null;
  report?: TruthTreeCheckReport | null;
}) {
  return (
    <section className="panel assigned-item" aria-label="Assigned truth tree">
      <h2>
        Problem {item.position}: {item.title}
      </h2>
      {item.instructions && <p>{item.instructions}</p>}
      <TruthTreeSummary definition={item.content} />
      {answer ? (
        <details>
          <summary>Saved formula occurrences</summary>
          <ul>
            {answer.tree.occurrences.map((occurrence) => (
              <li key={occurrence.id}>
                <code>{occurrence.formula || '(blank)'}</code>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p>No saved tree.</p>
      )}
      {report && <TruthTreeFeedback report={report} />}
      {solution && (
        <section aria-label="Revealed truth-tree answer">
          <p>Argument: {solution.argumentStatus}.</p>
          <details>
            <summary>Reference formula occurrences</summary>
            <ul>
              {solution.referenceTree.occurrences.map((occurrence) => (
                <li key={occurrence.id}>
                  <code>{occurrence.formula || '(blank)'}</code>
                </li>
              ))}
            </ul>
          </details>
          {solution.explanation && <p>{solution.explanation}</p>}
        </section>
      )}
    </section>
  );
}
