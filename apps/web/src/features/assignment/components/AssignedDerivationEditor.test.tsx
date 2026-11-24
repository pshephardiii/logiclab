import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { derivationDefinition } from '../../../../test/derivation';
import { AssignedDerivationEditor } from './AssignedDerivationEditor';
import { blankDerivationAnswer } from '../helpers/proof-answers';
import { withFreshReference } from '../../../pages/problem-library/helpers/fresh-reference';

test.each(['fitch', 'dependency'] as const)(
  '%s starts assigned and reference work using the pinned catalog',
  (format) => {
    for (const version of [1, 2] as const) {
      const statement = {
        ...derivationDefinition,
        format,
        ruleCatalogVersion: version,
        ...(version === 2 ? { formulaGroupingVersion: 1 as const } : {}),
        premises: [{ id: crypto.randomUUID(), formula: '(P & Q) & R' }],
      };
      const onAnswer = vi.fn();
      const view = render(
        <AssignedDerivationEditor
          statement={statement}
          proof={null}
          readOnly={false}
          disabled={false}
          onAnswer={onAnswer}
          onPendingChange={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Start proof' }));
      expect(onAnswer).toHaveBeenCalledWith({
        type: 'derivation',
        proof: expect.objectContaining({
          proofVersion: version,
          format,
          steps: [
            expect.objectContaining({
              kind: 'premise',
              premiseId: statement.premises[0]!.id,
              formula: '(P & Q) & R',
            }),
          ],
        }),
      });
      expect(blankDerivationAnswer(format, version).proof.proofVersion).toBe(version);
      const fresh = withFreshReference({ ...statement, referenceProof: null });
      expect(fresh.referenceProof?.proofVersion).toBe(version);
      expect(fresh.premises).toEqual(statement.premises);
      expect(statement.referenceProof).toBeNull();
      view.unmount();
    }
  },
);

test('empty retained natural-deduction trees stay on catalog 1', () => {
  expect(blankDerivationAnswer('tree', 2).proof).toEqual({
    proofVersion: 1,
    format: 'tree',
    rootId: null,
    nodes: [],
  });
});
