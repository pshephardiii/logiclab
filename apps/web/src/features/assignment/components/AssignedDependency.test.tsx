import { useState, type ComponentProps } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { SavedDerivationAnswer } from '@logiclab/contracts/saved-student-work';
import {
  dependencyAnswer,
  dependencyWork,
  dependencyChecked,
} from '../../../../test/dependency-work-fixture';
import { proofAnswer } from '../../../../test/proof-work-fixture';
import { AssignedDerivation } from './AssignedDerivation';
type Props = ComponentProps<typeof AssignedDerivation>;
const item = dependencyWork.items[0]!;
if (!('content' in item) || item.content.type !== 'derivation') throw new Error('Expected proof');
const proofItem: Props['item'] = { ...item, content: item.content };
function setup(options: Partial<Props> = {}) {
  const onAnswer = vi.fn();
  const onCheck = vi.fn();
  let current: SavedDerivationAnswer | undefined = options.answer ?? dependencyAnswer;
  function Harness() {
    const [answer, setAnswer] = useState(current);
    return (
      <AssignedDerivation
        item={proofItem}
        readOnly={false}
        onCheck={onCheck}
        {...options}
        answer={answer}
        onAnswer={(next) => {
          current = next;
          setAnswer(next);
          onAnswer(next);
        }}
      />
    );
  }
  const view = render(<Harness />);
  return { ...view, user: userEvent.setup(), onAnswer, onCheck, current: () => current };
}

test('dependency student editing keeps the pinned format, never checks automatically and preserves explicit empty work', async () => {
  const f = setup();
  expect(screen.getByText('Dependency')).toBeInTheDocument();
  expect(screen.queryByLabelText('Proof format')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Open subproof' })).not.toBeInTheDocument();
  await f.user.type(screen.getByLabelText('Formula for line 1'), ' &');
  expect(f.onCheck).not.toHaveBeenCalled();
  await f.user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(f.onCheck).toHaveBeenCalledOnce();
  await f.user.click(screen.getByRole('button', { name: 'Clear proof' }));
  await f.user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(f.current()).toEqual({
    type: 'derivation',
    proof: { proofVersion: 1, format: 'dependency', steps: [] },
  });
});

test('feedback is bound to its exact dependency snapshot and hidden after an edit', async () => {
  const f = setup({
    feedback: { proof: dependencyAnswer.proof, report: dependencyChecked.feedback.report },
  });
  expect(screen.getByText(/Proof verified/)).toBeInTheDocument();
  const sources = screen.getByRole('group', { name: 'Dependencies for line 1' });
  await f.user.click(within(sources).getByRole('checkbox'));
  expect(screen.queryByText(/Proof verified/)).not.toBeInTheDocument();
  expect(f.current()).toMatchObject({ proof: { steps: [{ dependencies: [] }] } });
});

test('authorized dependency references remain independent from student work and read-only review has no edit controls', async () => {
  const before = structuredClone(dependencyAnswer);
  const f = setup({
    readOnly: true,
    solution: {
      ...proofItem.content,
      format: 'dependency',
      referenceProof: { proofVersion: 1, format: 'dependency', steps: [] },
      explanation: 'PRIVATE_DEPENDENCY_EXPLANATION',
    },
  });
  expect(screen.queryByRole('button', { name: 'Check proof' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Formula for line 1')).not.toBeInTheDocument();
  expect(screen.getByText('Your submitted proof')).toBeInTheDocument();
  expect(screen.getByText('Instructor reference proof')).toBeInTheDocument();
  expect(screen.getByText('PRIVATE_DEPENDENCY_EXPLANATION')).toBeInTheDocument();
  expect(f.onAnswer).not.toHaveBeenCalled();
  expect(dependencyAnswer).toEqual(before);
});

test('a saved proof with the wrong format cannot be silently reinterpreted or edited', () => {
  const f = setup({
    answer: proofAnswer,
    feedback: { proof: proofAnswer.proof, report: dependencyChecked.feedback.report },
  });
  expect(screen.getByRole('alert')).toHaveTextContent('does not match');
  expect(screen.queryByText(/Proof verified/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Formula for line 1')).not.toBeInTheDocument();
  expect(f.onAnswer).not.toHaveBeenCalled();
});

test('disabled dependency controls cannot change answers or invoke checking', () => {
  setup({ disabled: true });
  expect(screen.getByLabelText('Formula for line 1')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Check proof' })).toBeDisabled();
});
