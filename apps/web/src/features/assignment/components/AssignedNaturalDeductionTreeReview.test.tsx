import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { naturalDeductionTreeDerivationDefinition } from '../../../../test/derivation';
import { AssignedDerivation } from './AssignedDerivation';

const { referenceProof, explanation, ...content } = naturalDeductionTreeDerivationDefinition;
const item = {
  id: 'item',
  position: 1,
  title: 'Identity',
  instructions: null,
  content,
};

test('submitted tree shows the normalized conclusion and readonly diagram without reference content or editor controls', async () => {
  const onAnswer = vi.fn();
  render(
    <AssignedDerivation
      item={item}
      answer={{ type: 'derivation', proof: referenceProof! }}
      readOnly
      onAnswer={onAnswer}
    />,
  );
  expect(screen.getByLabelText('Proof conclusion')).toHaveTextContent('P → P');
  expect(screen.queryByText('Permitted rules')).not.toBeInTheDocument();
  expect(screen.queryByText(explanation!)).not.toBeInTheDocument();
  expect(screen.queryByText('Instructor reference proof')).not.toBeInTheDocument();
  await userEvent.setup().click(screen.getByText('Your retained proof'));
  const diagram = screen.getByRole('region', { name: 'Your retained proof diagram' });
  expect(diagram).toHaveTextContent('Conditional proof');
  expect(within(diagram).queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Check proof' })).not.toBeInTheDocument();
  expect(onAnswer).not.toHaveBeenCalled();
});

test('authorized reference and submitted tree remain separately labeled without replacing student work or implying a check', async () => {
  const studentProof = structuredClone(referenceProof!);
  studentProof.nodes[0]!.formula = 'Q';
  const before = structuredClone(studentProof);
  const onAnswer = vi.fn();
  render(
    <AssignedDerivation
      item={item}
      answer={{ type: 'derivation', proof: studentProof }}
      readOnly
      onAnswer={onAnswer}
      solution={{ ...content, referenceProof: referenceProof!, explanation }}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByText('Your retained proof'));
  await user.click(screen.getByText('Instructor reference proof'));
  expect(screen.getByRole('region', { name: 'Your retained proof diagram' })).toHaveTextContent(
    '[Q]',
  );
  expect(
    screen.getByRole('region', { name: 'Instructor reference proof diagram' }),
  ).toHaveTextContent('[P]');
  expect(screen.getByText(explanation!)).toBeInTheDocument();
  expect(screen.queryByText('Proof verified.')).not.toBeInTheDocument();
  expect(onAnswer).not.toHaveBeenCalled();
  expect(studentProof).toEqual(before);
});

test('unavailable tree work remains read-only even when its caller requests editing', () => {
  const onAnswer = vi.fn(),
    onCheck = vi.fn();
  render(
    <AssignedDerivation
      item={item}
      answer={{ type: 'derivation', proof: referenceProof! }}
      readOnly={false}
      onAnswer={onAnswer}
      onCheck={onCheck}
    />,
  );
  expect(screen.getByText(/unavailable for new work/)).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Check proof' })).not.toBeInTheDocument();
  expect(onAnswer).not.toHaveBeenCalled();
  expect(onCheck).not.toHaveBeenCalled();
});
