import {
  proofCheckReportSchema,
  PROOF_LIMITS,
  type ProofCheckInput,
  type ProofStep,
} from '@logiclab/contracts';
import { checkProof, PROPOSITIONAL_RULE_CATALOG, type PropositionalRuleId } from '../src/proof';
const id = (n: number) => `${n.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`;
const given = (n: number, slot: number, formula: string): ProofStep => ({
  kind: 'premise',
  id: id(n),
  blockId: null,
  premiseId: id(1000 + slot),
  formula,
});
const assume = (n: number, block: number, formula: string): ProofStep => ({
  kind: 'assumption',
  id: id(n),
  blockId: id(block),
  formula,
});
const infer = (
  n: number,
  formula: string,
  ruleId: string | null,
  lines: number[] = [],
  subproofs: number[] = [],
  blockId: number | null = null,
): ProofStep => ({
  kind: 'inference',
  id: id(n),
  blockId: blockId === null ? null : id(blockId),
  formula,
  ruleId,
  lineReferences: lines.map(id),
  subproofReferences: subproofs.map(id),
});
const block = (n: number, start: number, end: number | null, parent: number | null = null) => ({
  id: id(n),
  parentId: parent === null ? null : id(parent),
  assumptionId: id(start),
  endId: end === null ? null : id(end),
});
function input(
  conclusion: string,
  premises: string[],
  steps: ProofStep[],
  rules: string[],
  blocks: ProofCheckInput['proof']['blocks'] = [],
): ProofCheckInput {
  return {
    problem: {
      ruleCatalogVersion: 1,
      conclusion,
      premises: premises.map((formula, index) => ({ id: id(1001 + index), formula })),
      permittedRuleIds: rules,
    },
    proof: { proofVersion: 1, format: 'fitch', steps, blocks },
  };
}
function run(value: unknown) {
  const result = checkProof(value);
  expect(proofCheckReportSchema.safeParse(result).success).toBe(true);
  return result;
}
function direct(rule: PropositionalRuleId, conclusion: string, premises: string[]) {
  return input(
    conclusion,
    premises,
    [
      ...premises.map((formula, index) => given(index + 1, index + 1, formula)),
      infer(
        premises.length + 1,
        conclusion,
        rule,
        premises.map((_, index) => index + 1),
      ),
    ],
    [rule],
  );
}

test.each<[PropositionalRuleId, string, string[]]>([
  ['reiteration', 'P', ['P']],
  ['and_introduction', 'P & Q', ['P', 'Q']],
  ['and_elimination', 'Q', ['P & Q']],
  ['or_introduction', 'Q | P', ['P']],
  ['implication_elimination', 'Q', ['P -> Q', 'P']],
  ['contradiction_introduction', '⊥', ['P', '!P']],
  ['contradiction_elimination', 'Q', ['⊥']],
  ['biconditional_introduction', 'P <-> Q', ['P -> Q', 'Q -> P']],
  ['biconditional_elimination', 'Q -> P', ['P <-> Q']],
  ['double_negation_introduction', '!!P', ['P']],
  ['modus_tollens', '!P', ['P -> Q', '!Q']],
  ['disjunctive_syllogism', 'Q', ['P | Q', '!P']],
  ['hypothetical_syllogism', 'P -> R', ['P -> Q', 'Q -> R']],
  ['double_negation_elimination', 'P', ['!!P']],
  ['excluded_middle', 'P | !P', []],
])(
  'accepts a complete %s proof using only its explicitly enabled rule',
  (rule, conclusion, premises) => {
    expect(run(direct(rule, conclusion, premises))).toMatchObject({
      status: 'accepted',
      target: 'established',
      diagnostics: [],
    });
  },
);

test('accepts single-line and nested conditional proofs with actual scope/discharge', () => {
  const single = input(
    'P -> P',
    [],
    [assume(1, 101, 'P'), infer(2, 'P -> P', 'implication_introduction', [], [101])],
    ['implication_introduction'],
    [block(101, 1, 1)],
  );
  expect(run(single).status).toBe('accepted');
  const nested = input(
    'Q -> (P -> P)',
    [],
    [
      assume(1, 101, 'Q'),
      assume(2, 102, 'P'),
      infer(3, 'P -> P', 'implication_introduction', [], [102], 101),
      infer(4, 'Q -> (P -> P)', 'implication_introduction', [], [101]),
    ],
    ['implication_introduction'],
    [block(101, 1, 3), block(102, 2, 2, 101)],
  );
  expect(run(nested).status).toBe('accepted');
});

test.each<[PropositionalRuleId, string, string, string]>([
  ['negation_introduction', 'P -> ⊥', 'P', '!P'],
  ['proof_by_contradiction', '!P -> ⊥', '!P', 'P'],
])(
  '%s checks the whole cited subproof, not just its endpoints',
  (rule, premise, assumption, goal) => {
    const value = input(
      goal,
      [premise],
      [
        given(1, 1, premise),
        assume(2, 101, assumption),
        infer(3, '⊥', 'implication_elimination', [1, 2], [], 101),
        infer(4, goal, rule, [], [101]),
      ],
      ['implication_elimination', rule],
      [block(101, 2, 3)],
    );
    expect(run(value).status).toBe('accepted');
    value.proof.steps[2] = infer(3, '⊥', 'reiteration', [1], [], 101);
    value.problem.permittedRuleIds.push('reiteration');
    const bad = run(value);
    expect(bad.status).toBe('needs_review');
    expect(bad.steps[3]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'invalid' });
    expect(bad.target).toBe('not_established');
  },
);

test('accepts real proof-by-cases with two independently valid branches', () => {
  const value = input(
    'R',
    ['P | Q', 'P -> R', 'Q -> R'],
    [
      given(1, 1, 'P | Q'),
      given(2, 2, 'P -> R'),
      given(3, 3, 'Q -> R'),
      assume(4, 101, 'P'),
      infer(5, 'R', 'implication_elimination', [2, 4], [], 101),
      assume(6, 102, 'Q'),
      infer(7, 'R', 'implication_elimination', [3, 6], [], 102),
      infer(8, 'R', 'or_elimination', [1], [101, 102]),
    ],
    ['implication_elimination', 'or_elimination'],
    [block(101, 4, 5), block(102, 6, 7)],
  );
  expect(run(value).status).toBe('accepted');
  const final = value.proof.steps[7]!;
  if (final.kind !== 'inference') throw new Error('Expected inference');
  final.subproofReferences = [id(101), id(101)];
  expect(run(value)).toMatchObject({ status: 'needs_review', target: 'not_established' });
});

test('alternative complete routes need no reference-proof comparison', () => {
  const first = direct('and_elimination', 'P', ['P & Q']);
  const second = input(
    'P',
    ['P & Q'],
    [
      given(1, 1, 'P & Q'),
      infer(2, 'Q', 'and_elimination', [1]),
      infer(3, 'P', 'and_elimination', [1]),
      infer(4, 'P', 'reiteration', [3]),
    ],
    ['and_elimination', 'reiteration'],
  );
  expect(run(first).status).toBe('accepted');
  expect(run(second).status).toBe('accepted');
});

test('a locally correct downstream rule retains invalid support instead of becoming another local error', () => {
  const value = input(
    'R',
    ['P', 'Q -> R'],
    [
      given(1, 1, 'P'),
      given(2, 2, 'Q -> R'),
      infer(3, 'Q', 'reiteration', [1]),
      infer(4, 'R', 'implication_elimination', [3, 2]),
      infer(5, 'R', 'reiteration', [4]),
    ],
    ['reiteration', 'implication_elimination'],
  );
  const report = run(value);
  expect(report).toMatchObject({ status: 'needs_review', target: 'not_established' });
  expect(report.steps[2]).toMatchObject({ localStatus: 'invalid', dependencyStatus: 'valid' });
  expect(report.steps[3]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'invalid' });
  expect(report.steps[4]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'invalid' });
  expect(report.diagnostics.filter((item) => item.code === 'RULE_MISMATCH')).toHaveLength(1);
  expect(report.diagnostics.filter((item) => item.code === 'INVALID_DEPENDENCY')).toHaveLength(2);
});

test('an unused erroneous line requires review while a valid concluding path remains established', () => {
  const value = input(
    'P',
    ['P'],
    [given(1, 1, 'P'), infer(2, 'Q', 'reiteration', [1]), infer(3, 'P', 'reiteration', [1])],
    ['reiteration'],
  );
  const report = run(value);
  expect(report).toMatchObject({ status: 'needs_review', target: 'established' });
  expect(report.steps[2]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'valid' });
});

test('unused errors inside a closed block still trigger review without tainting an independent endpoint', () => {
  const value = input(
    'Q -> P',
    ['P'],
    [
      given(1, 1, 'P'),
      assume(2, 101, 'Q'),
      infer(3, 'R', 'reiteration', [1], [], 101),
      infer(4, 'P', 'reiteration', [1], [], 101),
      infer(5, 'Q -> P', 'implication_introduction', [], [101]),
    ],
    ['reiteration', 'implication_introduction'],
    [block(101, 2, 4)],
  );
  const report = run(value);
  expect(report).toMatchObject({ status: 'needs_review', target: 'established' });
  expect(report.steps[4]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'valid' });
});

test('incomplete and invalid syntax propagate unknown versus invalid dependencies', () => {
  const value = input(
    'R',
    ['P', 'Q -> R'],
    [
      given(1, 1, 'P'),
      given(2, 2, 'Q -> R'),
      infer(3, '', 'reiteration', [1]),
      infer(4, 'R', 'implication_elimination', [2, 3]),
    ],
    ['reiteration', 'implication_elimination'],
  );
  const blank = run(value);
  expect(blank).toMatchObject({ status: 'needs_review', target: 'unknown' });
  expect(blank.steps[3]).toMatchObject({
    localStatus: 'unassessable',
    dependencyStatus: 'unknown',
  });
  value.proof.steps[2]!.formula = 'Q &';
  const invalid = run(value);
  expect(invalid.steps[3]).toMatchObject({
    localStatus: 'unassessable',
    dependencyStatus: 'invalid',
  });
  expect(invalid.diagnostics).toContainEqual(
    expect.objectContaining({ code: 'INVALID_FORMULA', stepIndex: 2, position: 3 }),
  );
});

test('a missing earlier justification preserves a downstream local match with unknown support', () => {
  const value = input(
    'R',
    ['P', 'Q -> R'],
    [
      given(1, 1, 'P'),
      given(2, 2, 'Q -> R'),
      infer(3, 'Q', null, [1]),
      infer(4, 'R', 'implication_elimination', [2, 3]),
    ],
    ['reiteration', 'implication_elimination'],
  );
  const report = run(value);
  expect(report).toMatchObject({ status: 'needs_review', target: 'unknown' });
  expect(report.steps[3]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'unknown' });
});

test('extra accessible citations cannot be ignored to accept an otherwise matching inference', () => {
  const value = input(
    'P',
    ['P', 'Q'],
    [given(1, 1, 'P'), given(2, 2, 'Q'), infer(3, 'P', 'reiteration', [1, 2])],
    ['reiteration'],
  );
  const report = run(value);
  expect(report.status).toBe('needs_review');
  expect(report.diagnostics).toContainEqual(
    expect.objectContaining({ code: 'INVALID_REFERENCE', stepIndex: 2 }),
  );
});

test('active assumptions remain dependencies even when no line explicitly cites them', () => {
  const value = input(
    'Q -> P',
    ['P'],
    [
      given(1, 1, 'P'),
      assume(2, 101, 'Q &'),
      infer(3, 'P', 'reiteration', [1], [], 101),
      infer(4, 'Q -> P', 'implication_introduction', [], [101]),
    ],
    ['reiteration', 'implication_introduction'],
    [block(101, 2, 3)],
  );
  const report = run(value);
  expect(report.status).toBe('needs_review');
  expect(report.steps[2]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'invalid' });
  expect(report.steps[3]!.dependencyStatus).toBe('invalid');
});

test('forged premise declarations cannot supply a proof basis', () => {
  const value = input(
    'Q',
    ['P'],
    [given(1, 1, 'Q'), infer(2, 'Q', 'reiteration', [1])],
    ['reiteration'],
  );
  const mismatch = run(value);
  expect(mismatch).toMatchObject({ status: 'needs_review', target: 'not_established' });
  expect(mismatch.steps[1]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'invalid' });
  const first = value.proof.steps[0]!;
  if (first.kind !== 'premise') throw new Error('Expected premise');
  first.premiseId = id(999);
  expect(run(value).diagnostics).toContainEqual(
    expect.objectContaining({ code: 'INVALID_REFERENCE', stepIndex: 0 }),
  );
  first.premiseId = null;
  expect(run(value).steps[0]!.localStatus).toBe('unassessable');
});

test('supplied premises may prove themselves with no inference rules enabled', () => {
  const value = input('P', ['P', 'Q'], [given(1, 1, 'P')], []);
  expect(run(value).status).toBe('accepted');
});

test('unknown, disabled and missing rule selections cannot imply permission', () => {
  const value = direct('double_negation_elimination', 'P', ['!!P']);
  value.problem.permittedRuleIds = ['proof_by_contradiction'];
  expect(run(value).diagnostics).toContainEqual(expect.objectContaining({ code: 'RULE_DISABLED' }));
  const final = value.proof.steps[1]!;
  if (final.kind !== 'inference') throw new Error('Expected inference');
  final.ruleId = 'custom_rule';
  expect(run(value).diagnostics).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_RULE' }));
  final.ruleId = null;
  expect(run(value).target).toBe('unknown');
});

test('scope leaks and forward citations stay invalid even when formulas fit a local rule', () => {
  const value = input(
    'P',
    [],
    [assume(1, 101, 'P'), infer(2, 'P', 'reiteration', [1])],
    ['reiteration'],
    [block(101, 1, 1)],
  );
  expect(run(value)).toMatchObject({ status: 'needs_review', target: 'not_established' });
  const future = input(
    'P',
    ['P'],
    [infer(1, 'P', 'reiteration', [2]), given(2, 1, 'P'), infer(3, 'P', 'reiteration', [1])],
    ['reiteration'],
  );
  const report = run(future);
  expect(report.steps[2]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'invalid' });
});

test('only the final root-level line can establish the target', () => {
  const value = input('P', ['P', 'Q'], [given(1, 1, 'P'), given(2, 2, 'Q')], []);
  expect(run(value)).toMatchObject({ status: 'needs_review', target: 'not_established' });
  expect(run(input('P', [], [assume(1, 101, 'P')], [], [block(101, 1, 1)]))).toMatchObject({
    status: 'needs_review',
    target: 'not_established',
  });
  expect(run(input('P', [], [], []))).toMatchObject({
    status: 'needs_review',
    target: 'not_established',
  });
});

test('an unused open block preserves an established root target but still requires review', () => {
  const value = input(
    'P',
    ['P'],
    [given(1, 1, 'P'), assume(2, 101, 'Q')],
    [],
    [block(101, 2, null)],
  );
  expect(run(value)).toMatchObject({ status: 'needs_review', target: 'established' });
});

test('malformed layout never exposes accepted partial reports', () => {
  const value = direct('reiteration', 'P', ['P']);
  value.proof.steps[1]!.id = id(1);
  const report = run(value);
  expect(report).toMatchObject({ status: 'needs_review', target: 'unknown' });
  expect(
    report.steps.every(
      (step) => step.localStatus === 'unassessable' && step.dependencyStatus === 'unknown',
    ),
  ).toBe(true);
});

test.each([
  'duplicate-premise',
  'invalid-premise',
  'invalid-target',
  'duplicate-rule',
  'unknown-rule',
] as const)('invalid problem configuration is unassessable: %s', (kind) => {
  const value = direct('reiteration', 'P', ['P']);
  if (kind === 'duplicate-premise') value.problem.premises.push({ ...value.problem.premises[0]! });
  else if (kind === 'invalid-premise') value.problem.premises[0]!.formula = 'P &';
  else if (kind === 'invalid-target') value.problem.conclusion = 'P &';
  else if (kind === 'duplicate-rule') value.problem.permittedRuleIds.push('reiteration');
  else value.problem.permittedRuleIds.push('custom_rule');
  expect(run(value)).toMatchObject({ status: 'unassessable', target: 'unknown', steps: [] });
});

test.each([null, undefined, 3, [], {}, { problem: {}, proof: {} }])(
  'malformed raw input produces a bounded unassessable report: %#',
  (value) => {
    expect(run(value)).toMatchObject({ status: 'unassessable', target: 'unknown', steps: [] });
  },
);

test('unsupported versions and formats are explicit rather than reinterpreted', () => {
  const value = direct('reiteration', 'P', ['P']);
  for (const raw of [
    { ...value, problem: { ...value.problem, ruleCatalogVersion: 2 } },
    { ...value, proof: { ...value.proof, proofVersion: 2 } },
    { ...value, proof: { ...value.proof, format: 'tree' } },
  ])
    expect(run(raw).diagnostics[0]!.code).toBe('UNSUPPORTED_VERSION');
});

test('preflight rejects oversized lists before visiting their elements', () => {
  const value = direct('reiteration', 'P', ['P']);
  const huge = new Array(1_000_000);
  Object.defineProperty(huge, 0, {
    get() {
      throw new Error('Must not visit oversized elements');
    },
  });
  expect(run({ ...value, proof: { ...value.proof, steps: huge } }).diagnostics[0]!.code).toBe(
    'RESOURCE_LIMIT',
  );
  expect(
    run({ ...value, problem: { ...value.problem, premises: huge } }).diagnostics[0]!.code,
  ).toBe('RESOURCE_LIMIT');
});

test('unexpected recursive fields, accessors and exotic objects do not become proof work', () => {
  const value = direct('reiteration', 'P', ['P']);
  const cycle: Record<string, unknown> = { ...value };
  cycle.extra = cycle;
  expect(run(cycle).status).toBe('unassessable');
  const getter = {
    get problem() {
      throw new Error('Not plain data');
    },
    proof: value.proof,
  };
  expect(run(getter).status).toBe('unassessable');
  expect(run(new Date()).status).toBe('unassessable');
});

test('size and diagnostic overflow never return successful partial checking', () => {
  const value = direct('reiteration', 'P', ['P']);
  expect(
    run({ ...value, problem: { ...value.problem, conclusion: 'P'.repeat(257) } }).diagnostics[0]!
      .code,
  ).toBe('RESOURCE_LIMIT');
  const noisy = input(
    'P',
    [],
    Array.from({ length: 200 }, (_, index) =>
      infer(index + 1, 'P', 'or_elimination', [900, 901], [902, 903]),
    ),
    ['or_elimination'],
  );
  const report = run(noisy);
  expect(report).toMatchObject({ status: 'unassessable', target: 'unknown', steps: [] });
  expect(report.diagnostics).toHaveLength(PROOF_LIMITS.maxDiagnostics);
  expect(report.diagnostics.at(-1)!.code).toBe('RESOURCE_LIMIT');
});

test('the deterministic work budget stops expensive but transport-bounded checking', () => {
  const formula = Array.from({ length: 128 }, () => 'P').join('&');
  const steps: ProofStep[] = [
    given(1, 1, formula),
    ...Array.from({ length: 199 }, (_, index) =>
      infer(index + 2, formula, 'reiteration', [index + 1]),
    ),
  ];
  const report = run(input(formula, [formula], steps, ['reiteration']));
  expect(report).toMatchObject({ status: 'unassessable', target: 'unknown', steps: [] });
  expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: 'RESOURCE_LIMIT' }));
});

test('formula nesting limits are unassessable resource failures, not invented logical mistakes', () => {
  const value = direct('reiteration', 'P', ['P']);
  value.proof.steps[1]!.formula = '!'.repeat(33) + 'P';
  const report = run(value);
  expect(report).toMatchObject({ status: 'unassessable', target: 'unknown', steps: [] });
  expect(report.diagnostics).toContainEqual(
    expect.objectContaining({ code: 'RESOURCE_LIMIT', stepIndex: 1, position: 33 }),
  );
});

test('checking is deterministic, preserves source and normalizes UUID spelling only', () => {
  const value = direct('reiteration', 'P | Q', ['P v Q']);
  value.problem.premises[0]!.id = value.problem.premises[0]!.id.toUpperCase();
  const before = structuredClone(value);
  const report = run(value);
  expect(report.status).toBe('accepted');
  expect(run(value)).toEqual(report);
  expect(value).toEqual(before);
  expect(report).not.toHaveProperty('score');
  expect(PROPOSITIONAL_RULE_CATALOG).toHaveLength(19);
});
