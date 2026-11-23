import type { TruthTreeContent, TruthTreeSolution } from '@logiclab/contracts/truth-tree-authoring';
import { TruthTreeDisplay } from './TruthTreeDisplay';

/** Only independently authorized solution projections belong here. No student answers are changed. */
export function TruthTreeSolutionView({
  solution,
  statement,
}: {
  solution: TruthTreeSolution;
  statement?: TruthTreeContent;
}) {
  return (
    <section aria-label="Revealed truth-tree answer">
      <h3>Instructor reference tree</h3>
      <p>Argument: {solution.argumentStatus}.</p>
      <TruthTreeDisplay tree={solution.referenceTree} statement={statement} />
      {solution.counterexample && (
        <p>
          Counterexample:{' '}
          {Object.entries(solution.counterexample.assignment)
            .map(([name, value]) => `${name} = ${value ? 'T' : 'F'}`)
            .join(', ')}
        </p>
      )}
      {solution.explanation && <p>{solution.explanation}</p>}
    </section>
  );
}
