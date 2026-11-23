import { checkFitchProof, checkDependencyProof } from '../src/proof';
import {
  isFinishedFitchProofAttempt,
  isFinishedDependencyProofAttempt,
} from '../src/proof/completion';
import { checkTruthTree, isFinishedTruthTreeAttempt } from '../src/truth-tree';
import { proofCheckReportSchema } from '@logiclab/contracts';
import { truthTreeCheckReportSchema } from '@logiclab/contracts/truth-tree';
import { initialTree } from './truth-tree/check-fixture';
import { id } from './truth-tree/structure-fixture';

function proof(format: 'fitch' | 'dependency', source: string) {
  const step = { kind: 'premise', id: id(1), premiseId: id(2), formula: source };
  return {
    problem: {
      ruleCatalogVersion: 1,
      premises: [{ id: id(2), formula: source }],
      conclusion: source,
      permittedRuleIds: [],
    },
    proof:
      format === 'fitch'
        ? { proofVersion: 1, format, steps: [{ ...step, blockId: null }], blocks: [] }
        : { proofVersion: 1, format, steps: [{ ...step, dependencies: [id(1)] }] },
  };
}

test.each(['fitch', 'dependency'] as const)(
  '%s checks the pinned syntax policy for both statement and submitted lines',
  (format) => {
    const check = format === 'fitch' ? checkFitchProof : checkDependencyProof;
    const finished =
      format === 'fitch' ? isFinishedFitchProofAttempt : isFinishedDependencyProofAttempt;
    const old = proof(format, 'P v Q & R');
    expect(check(old).status).toBe('accepted');
    expect(check({ ...old, problem: { ...old.problem, formulaGroupingVersion: 1 } }).status).toBe(
      'unassessable',
    );
    const grouped = proof(format, 'P v (Q & R)');
    const current = { ...grouped, problem: { ...grouped.problem, formulaGroupingVersion: 1 } };
    expect(check(current).status).toBe('accepted');
    expect(finished(current)).toBe(true);
    const before = structuredClone(current);
    current.proof.steps[0]!.formula = 'P v Q & R';
    const result = check(current);
    expect(result.status).toBe('needs_review');
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_FORMULA', position: 6, stepIndex: 0 }),
      ]),
    );
    expect(proofCheckReportSchema.safeParse(result).success).toBe(true);
    expect(finished(current)).toBe(false);
    expect(check({ ...current, problem: grouped.problem }).status).toBe('accepted');
    expect(before.proof.steps[0]!.formula).toBe('P v (Q & R)');
    for (const formulaGroupingVersion of [0, 2])
      expect(
        check({ ...current, problem: { ...current.problem, formulaGroupingVersion } }),
      ).toMatchObject({
        status: 'unassessable',
        diagnostics: expect.arrayContaining([
          expect.objectContaining({ code: 'UNSUPPORTED_VERSION' }),
        ]),
      });
  },
);

function closedTree(source: string) {
  const input = initialTree([source], source);
  input.tree.branches[0]!.ending = {
    kind: 'closed',
    closure: {
      kind: 'complement',
      occurrenceIds: [input.tree.occurrences[0]!.id, input.tree.occurrences[1]!.id],
    },
  };
  return input;
}

test('truth trees honor pinned statement/occurrence grouping while completion retains reviewable mistakes', () => {
  const old = closedTree('P v Q & R');
  expect(checkTruthTree(old).status).toBe('verified');
  expect(
    checkTruthTree({ ...old, problem: { ...old.problem, formulaGroupingVersion: 1 } }).status,
  ).toBe('unassessable');
  const grouped = closedTree('P v (Q & R)');
  const current = {
    ...grouped,
    problem: { ...grouped.problem, formulaGroupingVersion: 1 as const },
  };
  expect(checkTruthTree(current).status).toBe('verified');
  expect(isFinishedTruthTreeAttempt(current)).toBe(true);
  current.tree.occurrences[0]!.formula = 'P v Q & R';
  const result = checkTruthTree(current);
  expect(result.status).toBe('invalid');
  expect(result.steps.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: 'INVALID_FORMULA',
        occurrenceId: current.tree.occurrences[0]!.id,
      }),
    ]),
  );
  expect(truthTreeCheckReportSchema.safeParse(result).success).toBe(true);
  expect(isFinishedTruthTreeAttempt(current)).toBe(true);
  expect(checkTruthTree({ ...current, problem: grouped.problem }).status).toBe('verified');
  expect(
    checkTruthTree({ ...current, problem: { ...current.problem, formulaGroupingVersion: 2 } })
      .status,
  ).toBe('unassessable');
});
