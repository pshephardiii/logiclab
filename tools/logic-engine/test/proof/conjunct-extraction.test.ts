import {
  matchProofConjunctExtraction,
  propositionalRuleCatalog,
  PROPOSITIONAL_RULE_CATALOG,
  PROPOSITIONAL_RULE_CATALOG_VERSION,
  PROPOSITIONAL_CHAIN_RULE_CATALOG_VERSION,
  PROPOSITIONAL_CONJUNCT_EXTRACTION_RULE,
  getPropositionalRule,
  checkLocalRule,
  checkFitchProof,
  checkDependencyProof,
  parseProofFormula,
  sameFormula,
  type ProofConjunctExtractionInput,
} from '../../src/proof';
import { evaluateFormula, parseFormula } from '../../src';
import { proofBudget } from '../../src/proof/proof-budget';
import { PROOF_LIMITS } from '@logiclab/contracts';

const input = (
  source: string,
  memberIndex: number,
  conclusion: string,
): ProofConjunctExtractionInput => ({
  ruleCatalogVersion: 2,
  formulaGroupingVersion: 1,
  source,
  memberIndex,
  conclusion,
});

test.each([
  ['P & Q & R', 0, 'P'],
  ['P & Q & R', 1, 'Q'],
  ['P & Q & R', 2, 'R'],
  ['(P & Q & R)', 0, 'P'],
  ['[P ^ Q ∧ R]', 2, 'R'],
  ['P & Q & P', 2, 'P'],
  ['(P & Q) & R', 0, 'P & Q'],
  ['P & (Q & R)', 1, 'Q & R'],
  ['P & [Q v R]', 1, '(Q | R)'],
  ['P & (Q -> R)', 1, '[Q → R]'],
  ['P & (Q <-> R)', 1, 'Q ↔ R'],
  ['P & !Q & R', 1, '~Q'],
  ['P & _|_', 1, '⊥'],
] as const)(
  'extracts one whole member under the pinned source: %s / %s',
  (source, index, conclusion) => {
    const value = input(source, index, conclusion);
    const before = structuredClone(value);
    const match = matchProofConjunctExtraction(value);
    expect(match).toMatchObject({
      status: 'matched',
      ruleCatalogVersion: 2,
      ruleId: 'and_chain_elimination',
      memberIndex: index,
    });
    if (match.status !== 'matched') throw new Error('Expected extraction');
    expect(sameFormula(parseProofFormula(match.derivedSource), parseProofFormula(conclusion))).toBe(
      true,
    );
    expect(value).toEqual(before);
  },
);

test.each([
  ['(P & Q) & R', 0, 'P'],
  ['P & (Q & R)', 1, 'Q'],
  ['!(P & Q)', 0, 'P'],
  ['P v Q', 0, 'P'],
  ['P -> Q', 0, 'Q'],
  ['P <-> Q', 0, 'P'],
  ['P', 0, 'P'],
  ['P & Q & R', 0, 'Q'],
  ['P & Q & R', 1, 'P & Q'],
  ['P & Q & R', 0, 'R & Q'],
  ['P & Q & R', 0, '!(!P)'],
  ['P & Q', -1, 'P'],
  ['P & Q', 2, 'Q'],
  ['P & Q', 0.5, 'P'],
  ['P & Q', Infinity, 'P'],
] as const)(
  'cannot skip a group, change rule/operator or infer an arbitrary formula: %s / %s',
  (source, index, conclusion) => {
    expect(matchProofConjunctExtraction(input(source, index, conclusion)).status).toBe('mismatch');
  },
);

test('later extraction retains inherited boundaries even when the entered line erases them', () => {
  const first = matchProofConjunctExtraction(input('((P & Q) & R) & S', 0, 'P & Q & R'));
  expect(first).toMatchObject({ status: 'matched', derivedSource: '(P & Q) & R' });
  if (first.status !== 'matched') throw new Error('Expected extraction');
  expect(matchProofConjunctExtraction(input(first.derivedSource, 0, 'P')).status).toBe('mismatch');
  const second = matchProofConjunctExtraction(input(first.derivedSource, 0, 'P & Q'));
  if (second.status !== 'matched') throw new Error('Expected grouped member');
  expect(matchProofConjunctExtraction(input(second.derivedSource, 0, 'P')).status).toBe('matched');
});

test('student-added inner groups remain, while root-only wrapping does not block extraction', () => {
  const match = matchProofConjunctExtraction(input('(P & Q & R) & S', 0, '(P & Q) & R'));
  expect(match).toMatchObject({ status: 'matched', derivedSource: '(P & Q) & R' });
  if (match.status !== 'matched') throw new Error('Expected extraction');
  expect(matchProofConjunctExtraction(input(match.derivedSource, 0, 'P')).status).toBe('mismatch');
  expect(matchProofConjunctExtraction(input('[P & Q & R]', 0, 'P')).status).toBe('matched');
});

test('equal semantic members with different internal boundaries remain separately selectable', () => {
  const source = '((P & Q) & R) & (P & Q & R)';
  const restricted = matchProofConjunctExtraction(input(source, 0, 'P & Q & R'));
  const flexible = matchProofConjunctExtraction(input(source, 1, 'P & Q & R'));
  if (restricted.status !== 'matched' || flexible.status !== 'matched')
    throw new Error('Expected members');
  expect(restricted.derivedSource).toBe('(P & Q) & R');
  expect(flexible.derivedSource).toBe('P & Q & R');
  expect(matchProofConjunctExtraction(input(restricted.derivedSource, 0, 'P')).status).toBe(
    'mismatch',
  );
  expect(matchProofConjunctExtraction(input(flexible.derivedSource, 0, 'P')).status).toBe(
    'matched',
  );
});

test.each([
  ['P & Q v R', 'invalid_source', 'unassessable'],
  ['P &', 'invalid_source', 'unassessable'],
  ['P @ Q', 'invalid_source', 'unassessable'],
  ['', 'invalid_source', 'unassessable'],
] as const)(
  'malformed or mixed source does not become a wrong student answer: %s',
  (source, reason, status) => {
    expect(matchProofConjunctExtraction(input(source, 0, 'P'))).toMatchObject({ status, reason });
  },
);

test.each(['', 'P &', 'P @ Q', 'P v Q -> R'])(
  'a malformed/mixed conclusion is a positioned mismatch: %s',
  (conclusion) => {
    expect(matchProofConjunctExtraction(input('P & Q', 0, conclusion))).toMatchObject({
      status: 'mismatch',
      reason: 'invalid_conclusion',
      position: expect.any(Number),
    });
  },
);

test('runtime input/version guards do not silently downgrade checking', () => {
  for (const value of [null, { ...input('P & Q', 0, 'P'), source: {} }])
    expect(
      matchProofConjunctExtraction(value as unknown as ProofConjunctExtractionInput),
    ).toMatchObject({ status: 'unassessable', reason: 'invalid_input' });
  for (const value of [
    { ...input('P & Q', 0, 'P'), ruleCatalogVersion: 1 },
    { ...input('P & Q', 0, 'P'), ruleCatalogVersion: 3 },
    { ...input('P & Q', 0, 'P'), formulaGroupingVersion: undefined },
    { ...input('P & Q', 0, 'P'), formulaGroupingVersion: 2 },
  ])
    expect(matchProofConjunctExtraction(value as unknown as ProofConjunctExtractionInput)).toEqual({
      status: 'unassessable',
      reason: 'unsupported_version',
    });
});

test('resource limits include input length, inherited groups, combined nesting and deterministic work', () => {
  for (const value of [
    input('P'.repeat(257), 0, 'P'),
    input('P & Q', 0, 'P'.repeat(257)),
    input('((P & Q) & R) & S', 0, 'P & Q & R'.padEnd(256, ' ')),
    input('((P & Q) & R) & S', 0, '('.repeat(32) + 'P&Q&R' + ')'.repeat(32)),
  ])
    expect(matchProofConjunctExtraction(value)).toMatchObject({
      status: 'unassessable',
      reason: 'resource_limit',
    });
  const budget = proofBudget();
  budget.spend(PROOF_LIMITS.maxCheckWork - 1);
  expect(matchProofConjunctExtraction(input('P & Q', 0, 'P'), budget)).toMatchObject({
    status: 'unassessable',
    reason: 'resource_limit',
  });
});

test('compact maximum-length chains retain bounded matching and distinct positions', () => {
  const source = Array(128).fill('P').join('&');
  expect(source).toHaveLength(255);
  expect(matchProofConjunctExtraction(input(source, 127, 'P'))).toMatchObject({
    status: 'matched',
    memberIndex: 127,
    memberCount: 128,
    derivedSource: 'P',
  });
});

test('shared boundary traversal charges explicit finite work units to the proof budget', () => {
  const budget = proofBudget();
  const charges: number[] = [];
  const match = matchProofConjunctExtraction(input('((P & Q) & R) & S', 0, 'P & Q & R'), {
    spend(units) {
      expect(Number.isInteger(units) && units > 0).toBe(true);
      charges.push(units);
      budget.spend(units);
    },
  });
  expect(match.status).toBe('matched');
  expect(charges).toContain(1);
});

test('accepted extraction is truth-preserving for every valuation of representative compound members', () => {
  for (const [source, memberIndex, conclusion] of [
    ['P & Q & R', 1, 'Q'],
    ['(P v Q) & (Q -> R) & P', 1, 'Q -> R'],
    ['[P <-> Q] & !R', 0, 'P <-> Q'],
  ] as const) {
    expect(matchProofConjunctExtraction(input(source, memberIndex, conclusion)).status).toBe(
      'matched',
    );
    for (let bits = 0; bits < 8; bits++) {
      const valuation = { P: Boolean(bits & 1), Q: Boolean(bits & 2), R: Boolean(bits & 4) };
      if (evaluateFormula(parseFormula(source), valuation))
        expect(evaluateFormula(parseFormula(conclusion), valuation)).toBe(true);
    }
  }
});

test('catalog 2 keeps catalog-1 behavior and rejects mismatched full-proof versions', () => {
  expect(PROPOSITIONAL_RULE_CATALOG_VERSION).toBe(1);
  expect(PROPOSITIONAL_CHAIN_RULE_CATALOG_VERSION).toBe(2);
  expect(propositionalRuleCatalog(1)).toBe(PROPOSITIONAL_RULE_CATALOG);
  const staged = propositionalRuleCatalog(2);
  expect(staged.slice(0, -1)).toEqual(PROPOSITIONAL_RULE_CATALOG);
  expect(staged).toHaveLength(20);
  expect(staged.at(-1)).toBe(PROPOSITIONAL_CONJUNCT_EXTRACTION_RULE);
  expect(Object.isFrozen(staged)).toBe(true);
  expect(Object.isFrozen(PROPOSITIONAL_CONJUNCT_EXTRACTION_RULE.aliases)).toBe(true);
  expect(PROPOSITIONAL_CONJUNCT_EXTRACTION_RULE).toMatchObject({
    category: 'derived',
    lineReferences: 1,
    subproofReferences: 0,
  });
  expect(getPropositionalRule('and_chain_elimination')).toBeUndefined();
  expect(() => propositionalRuleCatalog(3 as 2)).toThrow(RangeError);

  const local = {
    ruleCatalogVersion: 1,
    ruleId: 'and_chain_elimination',
    permittedRuleIds: ['and_chain_elimination'],
    conclusion: parseProofFormula('P'),
    lines: [parseProofFormula('P & Q & R')],
    subproofs: [],
  };
  expect(checkLocalRule(local)).toEqual({ status: 'invalid', code: 'UNKNOWN_RULE' });
  expect(checkLocalRule({ ...local, ruleCatalogVersion: 2 })).toEqual({
    status: 'unassessable',
    code: 'UNSUPPORTED_VERSION',
  });
  expect(
    checkLocalRule({ ...local, ruleId: 'and_elimination', permittedRuleIds: ['and_elimination'] })
      .status,
  ).toBe('invalid');
  for (const [format, check] of [
    ['fitch', checkFitchProof],
    ['dependency', checkDependencyProof],
  ] as const) {
    const report = check({
      problem: {
        ruleCatalogVersion: 2,
        formulaGroupingVersion: 1,
        premises: [],
        conclusion: 'P',
        permittedRuleIds: ['and_chain_elimination'],
      },
      proof: { proofVersion: 1, format, steps: [], ...(format === 'fitch' ? { blocks: [] } : {}) },
    });
    expect(report.status).toBe('unassessable');
    expect(report.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'UNSUPPORTED_VERSION' })]),
    );
  }
});
