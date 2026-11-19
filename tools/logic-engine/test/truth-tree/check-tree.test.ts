import { truthTreeCheckReportSchema } from '@logiclab/contracts/truth-tree';
import { checkTruthTree, checkTruthTreeSteps, parseTruthTreeFormula } from '../../src/truth-tree';
import { analyzeTruthTreeSteps } from '../../src/truth-tree/check-steps';
import { parseFormula, evaluateFormula } from '../../src';
import { TruthTreeResourceLimit, truthTreeBudget } from '../../src/truth-tree/structure-context';
import { initialTree, completeTree, treeBuilder } from './check-fixture';
import { id } from './structure-fixture';
import * as counterexamples from '../../src/truth-tree/counterexample';

function checked(input: unknown) {
  const report = checkTruthTree(input);
  expect(truthTreeCheckReportSchema.safeParse(report).success).toBe(true);
  return report;
}

test.each<[string[], string]>([
  [['P'], 'P'],
  [['P -> Q', 'P'], 'Q'],
  [['P v Q', '!P'], 'Q'],
  [['P & Q'], 'P'],
  [['P <-> Q'], 'P -> Q'],
  [['!(P v Q)'], '!P & !Q'],
  [[], 'P v !P'],
  [[], '(P -> Q) <-> (!P v Q)'],
])('all closed branches establish validity: %j entails %s', (premises, conclusion) => {
  const input = completeTree(premises, conclusion);
  const before = structuredClone(input);
  const report = checked(input);
  expect(report.status).toBe('verified');
  expect(report.argumentStatus).toBe('valid');
  expect(report.branches.every((branch) => branch.status === 'closed')).toBe(true);
  expect(report.counterexample).toBeNull();
  expect(input).toEqual(before);
});

const sources = ['P & Q', 'P v Q', 'P -> Q', 'P <-> Q'];
const oracleCases = sources
  .flatMap((source) => [source, `!(${source})`])
  .flatMap((source) =>
    ['P', 'Q', '!P', 'P & Q', 'P <-> Q'].map((conclusion) => [source, conclusion] as const),
  );

test.each(oracleCases)(
  'completed tree agrees with independent truth-value oracle: %s entails %s',
  (premise, conclusion) => {
    let valid = true;
    for (let bits = 0; bits < 4; bits++) {
      const assignment = { P: Boolean(bits & 1), Q: Boolean(bits & 2) };
      if (
        evaluateFormula(parseFormula(premise), assignment) &&
        !evaluateFormula(parseFormula(conclusion), assignment)
      )
        valid = false;
    }
    const report = checked(completeTree([premise], conclusion));
    expect(report.status).toBe('verified');
    expect(report.argumentStatus).toBe(valid ? 'valid' : 'invalid');
    if (report.counterexample) {
      expect(evaluateFormula(parseFormula(premise), report.counterexample.assignment)).toBe(true);
      expect(evaluateFormula(parseFormula(conclusion), report.counterexample.assignment)).toBe(
        false,
      );
    }
  },
);

test('an unfinished open branch is undetermined even when a guessed valuation could refute the argument', () => {
  const report = checked(initialTree(['P v Q'], 'R'));
  expect(report.status).toBe('incomplete');
  expect(report.argumentStatus).toBe('undetermined');
  expect(report.branches[0]!.unexpandedOccurrenceIds).toHaveLength(1);
  expect(report.counterexample).toBeNull();
});

test('an unmarked contradictory branch needs explicit closure and cannot supply a counterexample', () => {
  const report = checked(initialTree(['P'], 'P'));
  expect(report.status).toBe('incomplete');
  expect(report.branches[0]!.status).toBe('needs_closure');
  expect(report.argumentStatus).toBe('undetermined');
  expect(report.counterexample).toBeNull();
});

test('verified closure does not require decomposing irrelevant remaining compounds', () => {
  const report = checked(completeTree(['P', '!P', 'Q v R'], 'S'));
  expect(report.argumentStatus).toBe('valid');
  expect(report.steps.expansions).toEqual([]);
});

test('one complete open branch refutes the argument while another path remains unfinished', () => {
  const input = initialTree(['P v (Q & R)'], 'S');
  treeBuilder(input).expand(input.tree.branches[0]!, input.tree.occurrences[0]!.id);
  const report = checked(input);
  expect(report.status).toBe('verified');
  expect(report.argumentStatus).toBe('invalid');
  expect(report.branches.map((branch) => branch.status)).toEqual(['open_complete', 'incomplete']);
  expect(report.counterexample!.assignment).toEqual({ P: true, Q: false, R: false, S: false });
});

test('ancestor expansion on one child does not complete its sibling path', () => {
  const input = initialTree(['P v Q', 'R v S'], 'T');
  const builder = treeBuilder(input);
  const [left, right] = builder.expand(input.tree.branches[0]!, input.tree.occurrences[0]!.id);
  builder.expand(left!, input.tree.occurrences[1]!.id);
  const report = checked(input);
  expect(report.argumentStatus).toBe('invalid');
  expect(report.branches.find((branch) => branch.branchId === right!.id)).toMatchObject({
    status: 'incomplete',
    unexpandedOccurrenceIds: [input.tree.occurrences[1]!.id],
  });
});

test('equal-text formula occurrences each require their own expansion coverage', () => {
  const input = initialTree(['P v Q', 'P v Q'], 'R');
  treeBuilder(input).expand(input.tree.branches[0]!, input.tree.occurrences[0]!.id);
  const report = checked(input);
  expect(report.argumentStatus).toBe('undetermined');
  expect(
    report.branches.every((branch) =>
      branch.unexpandedOccurrenceIds.includes(input.tree.occurrences[1]!.id),
    ),
  ).toBe(true);
});

test('defaulted variables form a total original-argument assignment, including all 26 letters', () => {
  const variables = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const input = completeTree([variables.join(' v ')], 'Z');
  const report = checked(input);
  expect(report.argumentStatus).toBe('invalid');
  expect(Object.keys(report.counterexample!.assignment)).toEqual(variables);
  expect(report.counterexample!.assignment.Z).toBe(false);
});

test.each<[string[], string, string]>([
  [[], 'P', 'invalid'],
  [[], '⊥', 'invalid'],
  [[], '!⊥', 'valid'],
  [['⊥'], 'P', 'valid'],
  [['!⊥'], 'P', 'invalid'],
  [['F'], 'P', 'invalid'],
])(
  'empty premises and falsity have correct outcomes: %j entails %s',
  (premises, conclusion, outcome) => {
    const report = checked(completeTree(premises, conclusion));
    expect(report.status).toBe('verified');
    expect(report.argumentStatus).toBe(outcome);
    if (premises[0] === 'F')
      expect(report.counterexample!.assignment).toMatchObject({ F: true, P: false });
  },
);

test('one wrong entered step blocks verification despite a usable open branch elsewhere', () => {
  const input = completeTree(['P v Q'], 'R');
  input.tree.occurrences.at(-1)!.formula = 'P';
  const report = checked(input);
  expect(report.status).toBe('invalid');
  expect(report.argumentStatus).toBe('undetermined');
  expect(report.branches).toEqual([]);
  expect(report.counterexample).toBeNull();
});

test('partial work, malformed configuration and structural violations retain distinct outcomes', () => {
  const input = initialTree(['P'], 'Q');
  input.tree.rootBranchId = null;
  expect(checked(input).status).toBe('incomplete');
  input.tree.rootBranchId = id(9999);
  expect(checked(input).status).toBe('invalid');
  input.problem.conclusion = 'P &';
  expect(checked(input).status).toBe('unassessable');
  expect(checked(null).status).toBe('unassessable');
});

test('resource exhaustion after step checking discards all partial certification', () => {
  const input = completeTree(['P v Q'], 'R');
  let stepWork = 0;
  expect(
    checkTruthTreeSteps(input, {
      spend(units = 1) {
        stepWork += units;
      },
    }).status,
  ).toBe('checked');
  let used = 0;
  const report = checkTruthTree(input, {
    spend(units = 1) {
      used += units;
      if (used > stepWork) throw new TruthTreeResourceLimit('Test work limit.');
    },
  });
  expect(truthTreeCheckReportSchema.safeParse(report).success).toBe(true);
  expect(report.status).toBe('unassessable');
  expect(report.steps.occurrences).toEqual([]);
  expect(report.branches).toEqual([]);
  expect(report.counterexample).toBeNull();
});

test('independent counterexample verification failure remains unassessable', () => {
  const spy = jest.spyOn(counterexamples, 'truthTreeCounterexample').mockReturnValue(null);
  try {
    const report = checked(completeTree([], 'P'));
    expect(report.status).toBe('unassessable');
    expect(report.argumentStatus).toBe('undetermined');
    expect(report.steps.diagnostics[0]!.code).toBe('VERIFICATION_FAILED');
  } finally {
    spy.mockRestore();
  }
});

test('counterexample verification rechecks original premises, conclusion and every path formula', () => {
  const input = completeTree(['P v Q'], 'R');
  function evidence() {
    const result = analyzeTruthTreeSteps(input, truthTreeBudget());
    if (!result.evidence) throw Error('Expected checked fixture.');
    return result.evidence;
  }
  const branchId = input.tree.branches.find((branch) => branch.parentId !== null)!.id;
  const original = evidence();
  expect(counterexamples.truthTreeCounterexample(original, branchId)).not.toBeNull();

  const changedPremises = evidence();
  changedPremises.argument.premises.set(id(999), parseTruthTreeFormula('R'));
  expect(counterexamples.truthTreeCounterexample(changedPremises, branchId)).toBeNull();

  const changedConclusion = evidence();
  changedConclusion.argument.conclusion = parseTruthTreeFormula('R v !R');
  expect(counterexamples.truthTreeCounterexample(changedConclusion, branchId)).toBeNull();

  const changedPath = evidence();
  changedPath.context.structure.paths.get(branchId)!.push(id(999));
  changedPath.context.formulas.set(id(999), parseTruthTreeFormula('Q & !Q'));
  expect(counterexamples.truthTreeCounterexample(changedPath, branchId)).toBeNull();
});

test('report contracts reject invented argument outcomes and mismatched witness paths', () => {
  const valid = checked(completeTree(['P'], 'P'));
  const invalid = checked(completeTree([], 'P'));
  expect(
    truthTreeCheckReportSchema.safeParse({
      ...valid,
      branches: [{ ...valid.branches[0], status: 'needs_closure' }],
    }).success,
  ).toBe(false);
  expect(truthTreeCheckReportSchema.safeParse({ ...invalid, counterexample: null }).success).toBe(
    false,
  );
  expect(
    truthTreeCheckReportSchema.safeParse({
      ...invalid,
      counterexample: { ...invalid.counterexample, branchId: id(999) },
    }).success,
  ).toBe(false);
  expect(
    truthTreeCheckReportSchema.safeParse({
      ...invalid,
      counterexample: { ...invalid.counterexample, assignment: { P: 'false' } },
    }).success,
  ).toBe(false);
  expect(
    truthTreeCheckReportSchema.safeParse({
      ...invalid,
      counterexample: { ...invalid.counterexample, assignment: { p: false } },
    }).success,
  ).toBe(false);
  expect(
    truthTreeCheckReportSchema.safeParse({
      ...valid,
      status: 'unassessable',
      argumentStatus: 'undetermined',
    }).success,
  ).toBe(false);
  expect(
    truthTreeCheckReportSchema.safeParse({
      ...invalid,
      argumentStatus: 'valid',
      counterexample: null,
      branches: invalid.branches.map((branch) => ({ ...branch, status: 'closed' })),
    }).success,
  ).toBe(false);
});
