import { useState, type ComponentProps } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { FitchProof, ProofCheckReport } from '@logiclab/contracts';
import {
  fitchDerivationAnswerSchema,
  type FitchDerivationAnswer,
} from '@logiclab/contracts/derivation-work';
import { derivationDefinition } from '../../../../test/derivation';
import { AssignedDerivation } from './AssignedDerivation';

type Props = ComponentProps<typeof AssignedDerivation>;
const { referenceProof: _reference, explanation: _explanation, ...content } = derivationDefinition;
const item: Props['item'] = {
  id: '11111111-1111-4111-8111-111111111111',
  position: 1,
  title: 'Conditional identity',
  instructions: 'Prove the conclusion.',
  content,
};
function identity(): FitchProof {
  const a = crypto.randomUUID();
  const b = crypto.randomUUID();
  const block = crypto.randomUUID();
  return {
    proofVersion: 1,
    format: 'fitch',
    steps: [
      { kind: 'assumption', id: a, blockId: block, formula: 'P' },
      {
        kind: 'inference',
        id: b,
        blockId: null,
        formula: 'P -> P',
        ruleId: 'implication_introduction',
        lineReferences: [],
        subproofReferences: [block],
      },
    ],
    blocks: [{ id: block, parentId: null, assumptionId: a, endId: a }],
  };
}
function accepted(proof: FitchProof): ProofCheckReport {
  return {
    checkerVersion: 1,
    ruleCatalogVersion: 1,
    status: 'accepted',
    target: 'established',
    diagnostics: [],
    steps: proof.steps.map((step, stepIndex) => ({
      stepId: step.id,
      stepIndex,
      localStatus: 'valid',
      dependencyStatus: 'valid',
    })),
  };
}
function setup(initial?: FitchDerivationAnswer, options: Partial<Props> = {}) {
  const onAnswer = vi.fn();
  const onCheck = vi.fn();
  let current = initial;
  function Harness({ options }: { options: Partial<Props> }) {
    const [answer, setAnswer] = useState(initial);
    current = answer;
    return (
      <AssignedDerivation
        item={item}
        readOnly={false}
        onCheck={onCheck}
        {...options}
        answer={answer}
        onAnswer={(next) => {
          onAnswer(next);
          if (next.proof.format !== 'fitch') throw new Error('Expected Fitch answer');
          setAnswer({ type: 'derivation', proof: next.proof });
        }}
      />
    );
  }
  const view = render(<Harness options={options} />);
  return {
    user: userEvent.setup(),
    onAnswer,
    onCheck,
    current: () => current,
    rerender: (next: Partial<Props>) => view.rerender(<Harness options={next} />),
  };
}

test('student constructs a Fitch proof using instructor labels and checks only on explicit request', async () => {
  const f = setup();
  expect(screen.getByText('No premises.')).toBeInTheDocument();
  expect(screen.getByText('Prove the conclusion.')).toBeInTheDocument();
  await f.user.click(screen.getByRole('button', { name: 'Start proof' }));
  await f.user.click(screen.getByRole('button', { name: 'Open subproof' }));
  await f.user.type(screen.getByLabelText('Formula for line 1'), 'P');
  const scope = screen.getByLabelText('New line scope') as HTMLSelectElement;
  const block = scope.value;
  const endpoint = screen.getByLabelText('Final line of Subproof 1 at line 1') as HTMLSelectElement;
  await f.user.selectOptions(endpoint, endpoint.options[1]!.value);
  await f.user.selectOptions(scope, '');
  await f.user.click(screen.getByRole('button', { name: 'Add inference line' }));
  await f.user.type(screen.getByLabelText('Formula for line 2'), 'P -> P');
  expect(
    within(screen.getByLabelText('Rule for line 2'))
      .getAllByRole('option')
      .map((option) => option.textContent),
  ).toEqual(['None', 'Conditional proof']);
  await f.user.selectOptions(screen.getByLabelText('Rule for line 2'), 'implication_introduction');
  await f.user.selectOptions(screen.getByLabelText('Line 2 subproof 1'), block);
  expect(fitchDerivationAnswerSchema.safeParse(f.current()).success).toBe(true);
  expect(f.current()!.proof.blocks[0]!.endId).toBe(f.current()!.proof.steps[0]!.id);
  expect(f.onCheck).not.toHaveBeenCalled();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  await f.user.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(f.onCheck).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('saved incomplete proofs retain their IDs and missing references without filling or checking them', async () => {
  const proof = identity();
  const last = proof.steps[1]!;
  if (last.kind !== 'inference') throw new Error('Expected inference');
  const missing = crypto.randomUUID();
  last.formula = 'P &';
  last.subproofReferences = [missing];
  const snapshot = structuredClone(proof);
  const f = setup({ type: 'derivation', proof });
  expect(f.onAnswer).not.toHaveBeenCalled();
  expect(f.onCheck).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Formula for line 2')).toHaveValue('P ∧');
  expect(screen.getByLabelText('Line 2 subproof 1')).toHaveValue(missing);
  expect(
    within(screen.getByLabelText('Line 2 subproof 1')).getByRole('option', {
      name: /Missing or unavailable/,
    }),
  ).toBeInTheDocument();
  await f.user.type(screen.getByLabelText('Formula for line 2'), ' Q');
  expect(f.current()!.proof.steps.map((step) => step.id)).toEqual(
    snapshot.steps.map((step) => step.id),
  );
  expect(proof).toEqual(snapshot);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('checking stays transient, and an old report disappears after editing even when it arrives late', async () => {
  const proof = identity();
  const f = setup({ type: 'derivation', proof }, { feedback: { proof, report: accepted(proof) } });
  expect(screen.getByRole('status')).toHaveTextContent('Proof verified.');
  await f.user.type(screen.getByLabelText('Formula for line 2'), ' &');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  f.rerender({ checking: true, feedback: { proof, report: accepted(proof) } });
  expect(screen.getByRole('button', { name: 'Checking proof…' })).toBeDisabled();
  expect(screen.getByLabelText('Formula for line 2')).toBeEnabled();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(f.onCheck).not.toHaveBeenCalled();
});

test('student diagnostics distinguish locally valid steps from invalid support and do not imply an awarded grade', () => {
  const proof = identity();
  const report: ProofCheckReport = {
    ...accepted(proof),
    status: 'needs_review',
    target: 'not_established',
    steps: [
      {
        stepId: proof.steps[1]!.id,
        stepIndex: 1,
        localStatus: 'valid',
        dependencyStatus: 'invalid',
      },
    ],
    diagnostics: [
      {
        code: 'INVALID_DEPENDENCY',
        stepIndex: 1,
        message: 'This step depends on an invalid earlier step.',
      },
    ],
  };
  setup({ type: 'derivation', proof }, { feedback: { proof, report } });
  expect(screen.getByRole('status')).toHaveTextContent('needs attention');
  expect(
    screen.getByText('Line 2: This step depends on an invalid earlier step.'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Line 2: local step valid; supporting dependencies invalid.'),
  ).toBeInTheDocument();
  expect(screen.queryByText(/points|zero credit|score:/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Instructor solution' })).not.toBeInTheDocument();
});

test('answer reveal is separate from feedback and never overwrites student work', () => {
  const proof = identity();
  proof.steps[1]!.formula = 'Q';
  const snapshot = structuredClone(proof);
  const f = setup({ type: 'derivation', proof });
  expect(screen.queryByText('PRIVATE_EXPLANATION')).not.toBeInTheDocument();
  f.rerender({
    solution: {
      type: 'derivation',
      definitionVersion: 1,
      format: 'fitch',
      checkerVersion: 1,
      ruleCatalogVersion: 1,
      referenceProof: identity(),
      explanation: 'PRIVATE_EXPLANATION',
    },
  });
  expect(screen.getByText('PRIVATE_EXPLANATION')).toBeInTheDocument();
  expect(screen.getByLabelText('Formula for line 2')).toHaveValue('Q');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(f.onAnswer).not.toHaveBeenCalled();
  expect(f.current()!.proof).toEqual(snapshot);
  f.rerender({});
  expect(screen.queryByText('PRIVATE_EXPLANATION')).not.toBeInTheDocument();
});

test('clearing a proof requires confirmation, preserves work on Keep and emits an explicit empty response', async () => {
  const f = setup({ type: 'derivation', proof: identity() });
  await f.user.click(screen.getByRole('button', { name: 'Clear proof' }));
  expect(screen.getByRole('group', { name: 'Confirm proof deletion' })).toHaveTextContent(
    'Delete 2 proof line(s)',
  );
  expect(f.onAnswer).not.toHaveBeenCalled();
  await f.user.click(screen.getByRole('button', { name: 'Keep proof work' }));
  expect(screen.getByLabelText('Formula for line 2')).toHaveValue('P → P');
  await f.user.click(screen.getByRole('button', { name: 'Clear proof' }));
  await f.user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(f.current()).toEqual({
    type: 'derivation',
    proof: { proofVersion: 1, format: 'fitch', steps: [], blocks: [] },
  });
  expect(f.onCheck).not.toHaveBeenCalled();
});

test('read-only submitted proofs expose no editor/check actions and preserve unresolved citations', () => {
  const proof = identity();
  const last = proof.steps[1]!;
  if (last.kind !== 'inference') throw new Error('Expected inference');
  last.subproofReferences = [crypto.randomUUID()];
  const f = setup({ type: 'derivation', proof }, { readOnly: true });
  expect(screen.getByText('Your submitted proof')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByText(/subproofs \?/)).toBeInTheDocument();
  expect(f.onAnswer).not.toHaveBeenCalled();
});

test('busy state disables all editing and checking, and checking can be omitted independently', async () => {
  const f = setup({ type: 'derivation', proof: identity() }, { disabled: true });
  expect(screen.getByLabelText('Formula for line 2')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Check proof' })).toBeDisabled();
  await f.user.click(screen.getByRole('button', { name: 'Clear proof' }));
  expect(f.onAnswer).not.toHaveBeenCalled();
  f.rerender({ onCheck: undefined });
  expect(screen.queryByRole('button', { name: 'Check proof' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Formula for line 2')).toBeEnabled();
});

test('unassessable feedback is explicit and does not invent a failed proof or numerical score', () => {
  const proof = identity();
  const report: ProofCheckReport = {
    checkerVersion: 1,
    ruleCatalogVersion: 1,
    status: 'unassessable',
    target: 'unknown',
    steps: [],
    diagnostics: [{ code: 'RESOURCE_LIMIT', message: 'The checking work limit was reached.' }],
  };
  setup({ type: 'derivation', proof }, { feedback: { proof, report }, onCheck: undefined });
  expect(screen.getByRole('status')).toHaveTextContent('could not be fully checked');
  expect(
    screen.getByText('Whether the conclusion is established could not be determined.'),
  ).toBeInTheDocument();
  expect(screen.getByText('The checking work limit was reached.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Check proof' })).not.toBeInTheDocument();
  expect(screen.queryByText(/incorrect|zero credit|0 points/i)).not.toBeInTheDocument();
});
