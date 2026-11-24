import {
  matchTruthTreeChainExpansion,
  TRUTH_TREE_CHAIN_RULE_CATALOG_VERSION,
  TRUTH_TREE_RULE_CATALOG_VERSION,
  TRUTH_TREE_RULE_CATALOG,
  checkTruthTree,
  type TruthTreeChainExpansionInput,
} from '../../src/truth-tree';
import { parseFormula, evaluateFormula } from '../../src';
import { truthTreeBudget } from '../../src/truth-tree/structure-context';
import { TRUTH_TREE_LIMITS } from '@logiclab/contracts/truth-tree';
import { initialTree } from './check-fixture';
import { id } from './structure-fixture';

function extract(
  source: string,
  memberIndex: number,
  result: string,
): TruthTreeChainExpansionInput {
  return {
    ruleCatalogVersion: 2,
    source,
    choice: { ruleId: 'conjunct_extraction', memberIndex },
    results: [result],
  };
}
function split(
  source: string,
  splitIndex: number,
  results: string[],
): TruthTreeChainExpansionInput {
  return { ruleCatalogVersion: 2, source, choice: { ruleId: 'disjunction', splitIndex }, results };
}

test.each([
  ['P & Q & R', 0, 'P'],
  ['P & Q & R', 1, 'Q'],
  ['P ^ Q & R', 2, 'R'],
  ['(P & Q) & R & S', 0, 'P & Q'],
  ['(P & Q) & R & S', 2, 'S'],
  ['P & (Q v R)', 1, 'Q v R'],
  ['[P & Q & R]', 0, 'P'],
] as const)(
  'conjunct extraction chooses a complete authoritative member without a remainder: %s',
  (source, index, result) => {
    const input = extract(source, index, result),
      before = structuredClone(input);
    expect(matchTruthTreeChainExpansion(input)).toMatchObject({
      status: 'matched',
      ruleCatalogVersion: 2,
      coveredMemberIndices: [index],
    });
    expect(input).toEqual(before);
  },
);

test.each([
  ['(P & Q) & R', 0, 'P'],
  ['P & (Q & R)', 1, 'Q'],
  ['!(P & Q)', 0, 'P'],
  ['P v Q', 0, 'P'],
  ['P & Q & R', 0, 'R'],
  ['P & Q', -1, 'P'],
  ['P & Q', 2, 'Q'],
  ['P & Q', 0.5, 'P'],
  ['P & Q', Infinity, 'P'],
] as const)(
  'extraction cannot cross a group, change operator, select another member or use an invalid index: %s',
  (source, index, result) => {
    expect(matchTruthTreeChainExpansion(extract(source, index, result)).status).toBe('mismatch');
  },
);

test.each([
  [1, ['P', 'Q v R v S']],
  [2, ['P v Q', 'R v S']],
  [3, ['P v Q v R', 'S']],
])(
  'disjunction can split an ungrouped chain after member %s without losing alternatives',
  (index, results) => {
    const source = 'P v Q v R v S';
    const input = split(source, index as number, results as string[]);
    const match = matchTruthTreeChainExpansion(input);
    expect(match).toMatchObject({
      status: 'matched',
      memberCount: 4,
      coveredMemberIndices: [0, 1, 2, 3],
    });
    for (let bits = 0; bits < 16; bits++) {
      const assignment = {
        P: Boolean(bits & 1),
        Q: Boolean(bits & 2),
        R: Boolean(bits & 4),
        S: Boolean(bits & 8),
      };
      expect(results.some((text) => evaluateFormula(parseFormula(text), assignment))).toBe(
        evaluateFormula(parseFormula(source), assignment),
      );
    }
  },
);

test.each([
  ['P v Q v R', 1, ['P', 'R']],
  ['P v Q v R', 1, ['P', 'R v Q']],
  ['P v Q v R', 1, ['P v Q', 'R']],
  ['P v Q v R', 1, ['Q', 'P v R']],
  ['P v Q v R', 0, ['P', 'Q v R']],
  ['P v Q v R', 3, ['P v Q', 'R']],
  ['P v Q v R', 1, ['P']],
  ['(P v Q) v R', 1, ['P', 'Q v R']],
  ['P v (Q v R)', 1, ['P v Q', 'R']],
  ['P & Q', 1, ['P', 'Q']],
  ['!(P v Q)', 1, ['P', 'Q']],
] as const)(
  'disjunction rejects omitted/reordered/foreign alternatives, group crossing and invalid cuts: %s',
  (source, index, results) => {
    expect(matchTruthTreeChainExpansion(split(source, index, [...results])).status).toBe(
      'mismatch',
    );
  },
);

test('derived continuation text preserves inherited groups even when an equivalent entered spelling removes them', () => {
  const first = matchTruthTreeChainExpansion(split('((P v Q) v R) v S', 1, ['P v Q v R', 'S']));
  expect(first.status).toBe('matched');
  if (first.status !== 'matched') throw new Error('fixture');
  expect(first.derivedSources).toEqual(['(P v Q) v R', 'S']);
  expect(
    matchTruthTreeChainExpansion(split(first.derivedSources[0]!, 1, ['P', 'Q v R'])).status,
  ).toBe('mismatch');
  expect(
    matchTruthTreeChainExpansion(split(first.derivedSources[0]!, 1, ['P v Q', 'R'])).status,
  ).toBe('matched');
  const extracted = matchTruthTreeChainExpansion(extract('((P & Q) & R) & S', 0, 'P & Q & R'));
  if (extracted.status !== 'matched') throw new Error('fixture');
  expect(extracted.derivedSources).toEqual(['(P & Q) & R']);
  expect(matchTruthTreeChainExpansion(extract(extracted.derivedSources[0]!, 0, 'P')).status).toBe(
    'mismatch',
  );
});

test('duplicate conjuncts retain distinct selected positions rather than being collapsed by text', () => {
  const first = matchTruthTreeChainExpansion(extract('P & P & Q', 0, 'P'));
  const second = matchTruthTreeChainExpansion(extract('P & P & Q', 1, 'P'));
  expect(first).toMatchObject({ status: 'matched', memberCount: 3, coveredMemberIndices: [0] });
  expect(second).toMatchObject({ status: 'matched', memberCount: 3, coveredMemberIndices: [1] });
});

test('extraction is a sound consequence across every valuation, including compound members', () => {
  const source = '(P v Q) & R';
  const match = matchTruthTreeChainExpansion(extract(source, 0, 'P v Q'));
  if (match.status !== 'matched') throw new Error('fixture');
  for (let bits = 0; bits < 8; bits++) {
    const assignment = { P: Boolean(bits & 1), Q: Boolean(bits & 2), R: Boolean(bits & 4) };
    if (evaluateFormula(parseFormula(source), assignment))
      expect(evaluateFormula(parseFormula(match.derivedSources[0]!), assignment)).toBe(true);
  }
});

test('bad formulas, unsupported versions, oversized data and exhausted budgets never produce a matched result', () => {
  expect(matchTruthTreeChainExpansion(extract('P v Q & R', 0, 'P'))).toMatchObject({
    status: 'unassessable',
    reason: 'invalid_formula',
  });
  expect(matchTruthTreeChainExpansion(extract('P & Q', 0, 'P @'))).toMatchObject({
    status: 'mismatch',
    reason: 'invalid_formula',
    position: 2,
  });
  const old = {
    ...extract('P & Q', 0, 'P'),
    ruleCatalogVersion: 1,
  } as unknown as TruthTreeChainExpansionInput;
  expect(matchTruthTreeChainExpansion(old)).toEqual({
    status: 'unassessable',
    reason: 'unsupported_version',
  });
  expect(matchTruthTreeChainExpansion(extract('P'.repeat(257), 0, 'P'))).toMatchObject({
    status: 'unassessable',
    reason: 'invalid_input',
  });
  const tooMany = { ...extract('P & Q', 0, 'P'), results: ['P', 'Q', 'P'] };
  expect(matchTruthTreeChainExpansion(tooMany)).toMatchObject({
    status: 'unassessable',
    reason: 'invalid_input',
  });
  const budget = truthTreeBudget();
  budget.spend(TRUTH_TREE_LIMITS.maxCheckWork - 1);
  expect(matchTruthTreeChainExpansion(extract('P & Q', 0, 'P'), budget)).toMatchObject({
    status: 'unassessable',
    reason: 'resource_limit',
  });
});

test('compact formulas at the length boundary do not grow beyond it when forming a remainder', () => {
  const source = Array.from({ length: 128 }, () => 'P').join('v');
  expect(source.length).toBe(255);
  const match = matchTruthTreeChainExpansion(split(source, 1, ['P', source.slice(2)]));
  expect(match.status).toBe('matched');
  if (match.status === 'matched')
    expect(match.derivedSources.every((text) => text.length <= 256)).toBe(true);
});

test('the staged matcher does not enable shortcuts in existing catalog-1 full-tree checking', () => {
  expect(TRUTH_TREE_CHAIN_RULE_CATALOG_VERSION).toBe(2);
  expect(TRUTH_TREE_RULE_CATALOG_VERSION).toBe(1);
  expect(
    TRUTH_TREE_RULE_CATALOG.some((rule) => (rule.id as string) === 'conjunct_extraction'),
  ).toBe(false);
  const input = initialTree(['P & Q & R'], 'P');
  const expansion = id(300),
    result = id(301);
  input.tree.occurrences.push({
    id: result,
    formula: 'P',
    origin: { kind: 'expansion', expansionId: expansion },
  });
  const root = input.tree.branches[0]!;
  root.occurrenceIds.push(result);
  input.tree.expansions.push({
    id: expansion,
    branchId: root.id,
    sourceId: input.tree.occurrences[0]!.id,
    ruleId: 'conjunct_extraction',
    resultGroups: [{ branchId: root.id, occurrenceIds: [result] }],
  });
  root.ending = {
    kind: 'closed',
    closure: { kind: 'complement', occurrenceIds: [input.tree.occurrences[1]!.id, result] },
  };
  const report = checkTruthTree(input);
  expect(report.status).toBe('invalid');
  expect(report.steps.diagnostics.some((item) => item.code === 'UNKNOWN_RULE')).toBe(true);
});

test('student-added explicit boundaries remain on derived continuations', () => {
  const match = matchTruthTreeChainExpansion(split('P v Q v R v S', 3, ['(P v Q) v R', 'S']));
  if (match.status !== 'matched') throw new Error('fixture');
  expect(match.derivedSources[0]).toBe('(P v Q) v R');
  expect(
    matchTruthTreeChainExpansion(split(match.derivedSources[0]!, 1, ['P', 'Q v R'])).status,
  ).toBe('mismatch');
});

test('restoring inherited boundaries cannot produce an oversized trusted continuation', () => {
  const result = 'P v Q v R'.padEnd(TRUTH_TREE_LIMITS.maxFormulaLength, ' ');
  expect(matchTruthTreeChainExpansion(split('((P v Q) v R) v S', 1, [result, 'S']))).toEqual({
    status: 'unassessable',
    reason: 'resource_limit',
  });
});
