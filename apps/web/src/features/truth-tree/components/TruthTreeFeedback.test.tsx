import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { checkTruthTree } from '@logiclab/logic-engine/truth-tree';
import {
  initialTruthTree,
  appendTruthTreeExpansion,
  closeTruthTreeBranch,
} from '../helpers/construction';
import { TruthTreeFeedback } from './TruthTreeFeedback';

test('feedback uses diagram branch numbers and distinguishes correct, wrong-verdict and unfinished work', () => {
  const problem = {
    ruleCatalogVersion: 1 as const,
    premises: [{ id: crypto.randomUUID(), formula: 'P & Q' }],
    conclusion: 'P',
  };
  const initial = initialTruthTree(problem);
  const expanded = appendTruthTreeExpansion(
    initial,
    initial.rootBranchId!,
    initial.occurrences[0]!.id,
    'conjunction',
    [['P', 'Q']],
  );
  const closed = closeTruthTreeBranch(expanded, expanded.rootBranchId!, {
    kind: 'complement',
    occurrenceIds: [expanded.occurrences[1]!.id, expanded.occurrences[2]!.id],
  });
  const report = checkTruthTree({ problem, tree: closed });
  const view = render(
    <TruthTreeFeedback
      tree={closed}
      report={report}
      verdict={{ answer: 'valid', status: 'correct' }}
    />,
  );
  expect(screen.getByRole('heading', { name: 'Nicely done!' })).toBeInTheDocument();
  expect(screen.getByText('Branch 1: Closed.')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Truth-tree feedback' })).toHaveClass(
    'truth-tree-feedback--success',
  );
  view.rerender(
    <TruthTreeFeedback
      tree={closed}
      report={report}
      verdict={{ answer: 'invalid', status: 'incorrect' }}
    />,
  );
  expect(screen.getByRole('region', { name: 'Truth-tree feedback' })).toHaveClass(
    'truth-tree-feedback--error',
  );
  expect(screen.getByText('Validity verdict: incorrect.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'A little more work needed' })).not.toHaveTextContent(
    '!',
  );
  view.rerender(
    <TruthTreeFeedback
      tree={initial}
      report={checkTruthTree({ problem, tree: initial })}
      verdict={{ answer: null, status: 'unanswered' }}
      showArgument={false}
    />,
  );
  expect(screen.getByRole('region', { name: 'Truth-tree feedback' })).toHaveClass(
    'truth-tree-feedback--pending',
  );
  expect(screen.getByText('Branch 1: Needs decomposition.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Keep going' })).not.toHaveTextContent('○');
  expect(screen.queryByText(/Argument:/)).not.toBeInTheDocument();
});

test('unexpected characters identify the formula and highlight the actual character', () => {
  const problem = {
    ruleCatalogVersion: 1 as const,
    premises: [{ id: crypto.randomUUID(), formula: 'P & Q' }],
    conclusion: 'R',
  };
  const initial = initialTruthTree(problem);
  const tree = appendTruthTreeExpansion(
    initial,
    initial.rootBranchId!,
    initial.occurrences[0]!.id,
    'conjunction',
    [['P @', 'Q']],
  );
  render(<TruthTreeFeedback tree={tree} report={checkTruthTree({ problem, tree })} />);
  expect(screen.getByText('Formula 3 · check character 3:')).toBeInTheDocument();
  expect(screen.getByLabelText('Character to check')).toHaveTextContent('@');
  expect(screen.queryByText(/Unexpected character/)).not.toBeInTheDocument();
});
