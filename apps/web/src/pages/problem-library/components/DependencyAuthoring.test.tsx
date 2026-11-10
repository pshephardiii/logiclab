import { installDialogStub } from '../../../../test/unsaved-work';
import { lineAction, openDependencies } from '../../../../test/proof-controls';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type {
  CreateLibraryProblemRequest,
  LibraryProblemDraft,
} from '@logiclab/contracts/problem-library';
import type { DependencyDerivationDefinition } from '@logiclab/contracts/dependency-derivation';
import { derivationDraft, derivationDefinition } from '../../../../test/derivation';
import { ProblemForm } from './ProblemForm';
import { DerivationSummary } from './DerivationSummary';

installDialogStub();

const a = 'a1111111-1111-4111-8111-111111111111';
const b = 'b2222222-2222-4222-8222-222222222222';
function definition(): DependencyDerivationDefinition {
  return {
    ...derivationDefinition,
    format: 'dependency',
    referenceProof: {
      proofVersion: 1,
      format: 'dependency',
      steps: [
        { kind: 'assumption', id: a, formula: 'P', dependencies: [a] },
        {
          kind: 'inference',
          id: b,
          formula: 'P -> P',
          dependencies: [],
          ruleId: 'implication_introduction',
          lineReferences: [],
          discharges: [{ assumptionId: a, conclusionId: a }],
        },
      ],
    },
  };
}
function setup(
  value: DependencyDerivationDefinition = { ...definition(), referenceProof: null },
  archived = false,
) {
  const problem: LibraryProblemDraft = {
    ...derivationDraft,
    definition: value,
    archivedAt: archived ? derivationDraft.updatedAt : null,
  };
  const props = {
    problem,
    busy: false,
    onSave: vi
      .fn<(input: CreateLibraryProblemRequest) => Promise<boolean>>()
      .mockResolvedValue(false),
    onDirty: vi.fn(),
    onPreview: vi.fn(),
  };
  return { ...render(<ProblemForm {...props} />), ...props, user: userEvent.setup() };
}

test('authors and checks a dependency conditional proof, saves explicitly and retains it after failure', async () => {
  const { user, onSave, onDirty, onPreview } = setup();
  await user.click(screen.getByRole('button', { name: 'Start reference proof' }));
  await user.selectOptions(screen.getByLabelText('Rule for line 1'), '__assumption__');
  await user.type(screen.getByLabelText('Formula for line 1'), 'P');
  await user.keyboard('{Enter}');
  await user.type(screen.getByLabelText('Formula for line 2'), 'P -> P');
  await user.selectOptions(screen.getByLabelText('Rule for line 2'), 'implication_introduction');
  const assumption = screen.getByLabelText('Line 2 discharge 1 assumption') as HTMLSelectElement;
  await user.selectOptions(assumption, assumption.options[1]!.value);
  const conclusion = screen.getByLabelText('Line 2 discharge 1 conclusion') as HTMLSelectElement;
  await user.selectOptions(conclusion, conclusion.options[1]!.value);
  await user.click(screen.getByRole('button', { name: 'Add line' }));
  expect(onSave).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('Current reference accepted');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const saved = onSave.mock.calls[0]![0].definition;
  expect(saved).toMatchObject({
    format: 'dependency',
    referenceProof: {
      format: 'dependency',
      steps: [{ dependencies: [expect.any(String)] }, { dependencies: [] }],
    },
  });
  expect(onDirty).toHaveBeenLastCalledWith(true);
  await lineAction(user, 2, 'Edit line 2');
  expect(screen.getByLabelText('Formula for line 2')).toHaveValue('P → P');
  await user.click(screen.getByRole('button', { name: 'Preview draft' }));
  expect(onPreview).toHaveBeenCalledWith(saved);
  await user.click(within(await openDependencies(user, 2)).getByRole('checkbox'));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('needs correction');
  expect(onSave).toHaveBeenCalledTimes(1);
});

test('format changes require explicit reference discard and preserve the statement and labels', async () => {
  const { user, onDirty } = setup(definition());
  await user.selectOptions(screen.getByLabelText('Proof format'), 'fitch');
  expect(screen.getByLabelText('Proof format')).toHaveValue('dependency');
  expect(screen.getByRole('group', { name: 'Confirm proof format change' })).toHaveTextContent(
    'discards the entire reference',
  );
  await user.click(screen.getByRole('button', { name: 'Keep current format' }));
  await lineAction(user, 2, 'Edit line 2');
  expect(screen.getByLabelText('Formula for line 2')).toHaveValue('P → P');
  await user.selectOptions(screen.getByLabelText('Proof format'), 'fitch');
  await user.click(screen.getByRole('button', { name: 'Change format and discard reference' }));
  expect(screen.getByLabelText('Proof format')).toHaveValue('fitch');
  expect(screen.queryByLabelText('Formula for line 1')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Conclusion')).toHaveValue('P → P');
  expect(screen.getByLabelText('Reference explanation (optional)')).toHaveValue(
    'Private instructor explanation',
  );
  expect(onDirty).toHaveBeenLastCalledWith(true);
  await user.selectOptions(screen.getByLabelText('Proof format'), 'dependency');
  expect(
    screen.queryByRole('group', { name: 'Confirm proof format change' }),
  ).not.toBeInTheDocument();
});

test('moves and confirmed deletions preserve unresolved references and annotations for explicit repair', async () => {
  const { user } = setup(definition());
  await lineAction(user, 2, 'Edit line 2');
  await lineAction(user, 2, 'Move line 2 up');
  expect(screen.getByLabelText('Line 1 discharge 1 assumption')).toHaveTextContent(
    'Missing or unavailable',
  );
  await lineAction(user, 1, 'Move line 1 down');
  await lineAction(user, 1, 'Edit line 1');
  await lineAction(user, 1, 'Delete line 1');
  await user.click(screen.getByRole('button', { name: 'Keep proof' }));
  expect(screen.getByRole('button', { name: 'Actions for line 2' })).toBeInTheDocument();
  await lineAction(user, 1, 'Delete line 1');
  await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  await lineAction(user, 1, 'Edit line 1');
  expect(screen.getByLabelText('Line 1 discharge 1 assumption')).toHaveTextContent(
    'Missing or unavailable',
  );
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('needs correction');
});

test('private dependency previews show source sets, discharge lines and explanation', async () => {
  const user = userEvent.setup();
  render(<DerivationSummary definition={definition()} />);
  await user.click(screen.getByText('Private reference proof'));
  expect(screen.getByText(/Dependency/)).toBeInTheDocument();
  expect(screen.getByText('Private instructor explanation')).toBeInTheDocument();
  expect(screen.getByText(/discharge 1–1/)).toBeInTheDocument();
  expect(screen.getAllByText(/dependencies/)).toHaveLength(2);
});

test('archive and busy guards cover dependency editing and format changes', () => {
  const view = setup(definition(), true);
  expect(screen.getByLabelText('Proof format')).toBeDisabled();
  expect(screen.getByLabelText('Formula for line 3')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Actions for line 1' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Check current proof' })).toBeDisabled();
  view.rerender(
    <ProblemForm
      problem={{ ...view.problem, archivedAt: null }}
      busy
      onSave={view.onSave}
      onDirty={view.onDirty}
      onPreview={view.onPreview}
    />,
  );
  expect(screen.getByLabelText('Proof format')).toBeDisabled();
});

test('unavailable sources are retained visibly until explicitly removed', async () => {
  const value = definition();
  value.referenceProof!.steps[1]!.dependencies = ['99999999-9999-4999-8999-999999999999'];
  const { user, onSave } = setup(value);
  await lineAction(user, 2, 'Edit line 2');
  await openDependencies(user, 2);
  expect(screen.getByText('Missing or unavailable dependency')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave.mock.calls[0]![0].definition).toMatchObject({
    referenceProof: { steps: [{}, { dependencies: value.referenceProof!.steps[1]!.dependencies }] },
  });
  await user.click(
    screen.getByRole('button', { name: 'Remove unavailable dependency 1 from line 2' }),
  );
  await user.click(screen.getByRole('button', { name: 'Check current proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('Current reference accepted');
});

test('duplicate identities disable structural editing without hiding retained evidence', () => {
  const value = definition();
  value.referenceProof!.steps[1]!.id = a;
  setup(value);
  expect(screen.getByRole('alert')).toHaveTextContent('duplicate identities');
  expect(screen.queryByRole('button', { name: 'New inference line' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove reference proof' })).toBeInTheDocument();
});

test('a clean saved draft becomes dirty for pending entry and blocks checks, preview and save until resolved', async () => {
  const { user, onSave, onPreview, onDirty } = setup(definition());
  expect(onDirty).toHaveBeenLastCalledWith(false);
  await user.type(screen.getByLabelText('Formula for line 3'), 'Q &');
  expect(onDirty).toHaveBeenLastCalledWith(true);
  for (const name of ['Save draft', 'Preview draft', 'Check current proof']) {
    expect(screen.getByRole('button', { name })).toBeDisabled();
    await user.click(screen.getByRole('button', { name }));
  }
  expect(screen.getByLabelText('Problem type')).toBeDisabled();
  expect(screen.getByLabelText('Proof format')).toBeDisabled();
  expect(onSave).not.toHaveBeenCalled();
  expect(onPreview).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Discard entry' }));
  expect(onDirty).toHaveBeenLastCalledWith(false);
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
});
