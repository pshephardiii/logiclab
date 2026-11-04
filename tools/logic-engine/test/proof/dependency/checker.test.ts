import {
  proofCheckReportSchema,
  PROOF_LIMITS,
  type DependencyProofCheckInput,
  type DependencyProofStep,
} from '@logiclab/contracts';
import { checkDependencyProof, checkProof, analyzeDependencyStructure } from '../../../src/proof';
const id = (n: number) => `${n.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`;
const given = (n: number, slot: number, formula: string): DependencyProofStep => ({
  kind: 'premise',
  id: id(n),
  premiseId: id(1000 + slot),
  formula,
  dependencies: [id(n)],
});
const assume = (n: number, formula: string): DependencyProofStep => ({
  kind: 'assumption',
  id: id(n),
  formula,
  dependencies: [id(n)],
});
const infer = (
  n: number,
  formula: string,
  ruleId: string | null,
  refs: number[] = [],
  deps: number[] = [],
  discharges: [number, number][] = [],
): DependencyProofStep => ({
  kind: 'inference',
  id: id(n),
  formula,
  ruleId,
  lineReferences: refs.map(id),
  dependencies: deps.map(id),
  discharges: discharges.map(([a, c]) => ({ assumptionId: id(a), conclusionId: id(c) })),
});
function input(
  conclusion: string,
  premises: string[],
  steps: DependencyProofStep[],
  rules: string[],
): DependencyProofCheckInput {
  return {
    problem: {
      ruleCatalogVersion: 1,
      conclusion,
      premises: premises.map((formula, index) => ({ id: id(1001 + index), formula })),
      permittedRuleIds: rules,
    },
    proof: { proofVersion: 1, format: 'dependency', steps },
  };
}
function run(value: unknown) {
  const report = checkDependencyProof(value);
  expect(proofCheckReportSchema.safeParse(report).success).toBe(true);
  return report;
}
function direct(rule: string, conclusion: string, premises: string[]) {
  return input(
    conclusion,
    premises,
    [
      ...premises.map((formula, i) => given(i + 1, i + 1, formula)),
      infer(
        premises.length + 1,
        conclusion,
        rule,
        premises.map((_, i) => i + 1),
        premises.map((_, i) => i + 1),
      ),
    ],
    [rule],
  );
}

test.each<[string, string, string[]]>([
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
])('accepts %s with the same logical pattern as Fitch', (rule, conclusion, premises) => {
  const value = direct(rule, conclusion, premises);
  expect(run(value).status).toBe('accepted');
  const steps = value.proof.steps.map((step) =>
    step.kind === 'premise'
      ? {
          kind: 'premise',
          id: step.id,
          formula: step.formula,
          premiseId: step.premiseId,
          blockId: null,
        }
      : {
          kind: 'inference',
          id: step.id,
          formula: step.formula,
          ruleId: step.kind === 'inference' ? step.ruleId : null,
          blockId: null,
          lineReferences: step.kind === 'inference' ? step.lineReferences : [],
          subproofReferences: [],
        },
  );
  expect(
    checkProof({
      problem: value.problem,
      proof: { proofVersion: 1, format: 'fitch', steps, blocks: [] },
    }).status,
  ).toBe('accepted');
});

test('conditional introduction discharges an assumption whose concluding line is itself', () => {
  expect(
    run(
      input(
        'P -> P',
        [],
        [assume(1, 'P'), infer(2, 'P -> P', 'implication_introduction', [], [], [[1, 1]])],
        ['implication_introduction'],
      ),
    ).status,
  ).toBe('accepted');
});
test.each(['negation_introduction', 'proof_by_contradiction'])(
  '%s checks actual assumption/conclusion formulas and discharges only that assumption',
  (rule) => {
    const negative = rule === 'negation_introduction';
    const value = input(
      negative ? '!P' : 'P',
      [negative ? '!P' : 'P'],
      [
        given(1, 1, negative ? '!P' : 'P'),
        assume(2, negative ? 'P' : '!P'),
        infer(3, '_|_', 'contradiction_introduction', [1, 2], [1, 2]),
        infer(4, negative ? '~P' : 'P', rule, [], [1], [[2, 3]]),
      ],
      ['contradiction_introduction', rule],
    );
    expect(run(value).status).toBe('accepted');
    value.proof.steps[3]!.formula = 'Q';
    expect(run(value).steps[3]!.localStatus).toBe('invalid');
  },
);
function cases() {
  return input(
    'R',
    ['P | Q', 'P -> R', 'Q -> R'],
    [
      given(1, 1, 'P | Q'),
      given(2, 2, 'P -> R'),
      given(3, 3, 'Q -> R'),
      assume(4, 'P'),
      infer(5, 'R', 'implication_elimination', [2, 4], [2, 4]),
      assume(6, 'Q'),
      infer(7, 'R', 'implication_elimination', [3, 6], [3, 6]),
      infer(
        8,
        'R',
        'or_elimination',
        [1],
        [1, 2, 3],
        [
          [4, 5],
          [6, 7],
        ],
      ),
    ],
    ['implication_elimination', 'or_elimination'],
  );
}
test('proof by cases unions the disjunction and both branch contexts', () => {
  expect(run(cases()).status).toBe('accepted');
});
test('nested and vacuous discharge retain the remaining outside dependency', () => {
  const value = input(
    'P -> (Q -> P)',
    [],
    [
      assume(1, 'P'),
      assume(2, 'Q'),
      infer(3, 'P', 'reiteration', [1], [1]),
      infer(4, 'Q -> P', 'implication_introduction', [], [1], [[2, 3]]),
      infer(5, 'P -> (Q -> P)', 'implication_introduction', [], [], [[1, 4]]),
    ],
    ['reiteration', 'implication_introduction'],
  );
  expect(run(value).status).toBe('accepted');
});
test('discharge is local: a previously discharged assumption can support a new conditional proof', () => {
  const value = input(
    'P -> P',
    [],
    [
      assume(1, 'P'),
      infer(2, 'P -> P', 'implication_introduction', [], [], [[1, 1]]),
      infer(3, 'P', 'reiteration', [1], [1]),
      infer(4, 'P -> P', 'implication_introduction', [], [], [[1, 3]]),
    ],
    ['implication_introduction', 'reiteration'],
  );
  expect(run(value).status).toBe('accepted');
});
test('discharging a case cannot erase that assumption from the disjunction context', () => {
  const value = input(
    'P',
    [],
    [
      assume(1, 'P'),
      infer(2, 'P | P', 'or_introduction', [1], [1]),
      assume(3, 'P'),
      infer(
        4,
        'P',
        'or_elimination',
        [2],
        [],
        [
          [1, 1],
          [3, 3],
        ],
      ),
    ],
    ['or_introduction', 'or_elimination'],
  );
  expect(run(value)).toMatchObject({ status: 'needs_review', target: 'not_established' });
  expect(run(value).steps[3]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'invalid' });
  value.proof.steps[3]!.dependencies = [id(1)];
  expect(run(value)).toMatchObject({ status: 'needs_review', target: 'not_established' });
  expect(run(value).steps[3]!.dependencyStatus).toBe('valid');
});
test('discharging one branch cannot erase another branch’s remaining assumption', () => {
  const value = input(
    'P',
    ['P | P'],
    [
      given(1, 1, 'P | P'),
      assume(2, 'P'),
      assume(3, 'P'),
      infer(4, 'P', 'reiteration', [2], [2]),
      infer(
        5,
        'P',
        'or_elimination',
        [1],
        [1],
        [
          [2, 4],
          [3, 4],
        ],
      ),
    ],
    ['reiteration', 'or_elimination'],
  );
  expect(run(value).steps[4]!.dependencyStatus).toBe('invalid');
  value.proof.steps[4]!.dependencies = [id(1), id(2)];
  expect(run(value)).toMatchObject({ status: 'needs_review', target: 'not_established' });
  expect(run(value).steps[4]!.dependencyStatus).toBe('valid');
});
test.each(['missing', 'extra', 'duplicate', 'inference-id', 'problem-id', 'forward'])(
  'rejects %s dependency annotations while preserving local correctness',
  (kind) => {
    const value = input(
      'P',
      ['P', 'Q'],
      [
        given(1, 1, 'P'),
        given(2, 2, 'Q'),
        infer(3, 'P', 'reiteration', [1], [1]),
        infer(4, 'P', 'reiteration', [3], [1]),
        assume(5, 'Q'),
        infer(6, 'P', 'reiteration', [4], [1]),
      ],
      ['reiteration'],
    );
    value.proof.steps[3]!.dependencies = {
      missing: [],
      extra: [id(1), id(2)],
      duplicate: [id(1), id(1)],
      'inference-id': [id(3)],
      'problem-id': [id(1001)],
      forward: [id(5)],
    }[kind]!;
    const report = run(value);
    expect(report.status).toBe('needs_review');
    expect(report.steps[3]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'invalid' });
    expect(report.steps[5]!.dependencyStatus).toBe('invalid');
  },
);
test('invalid premise work can feed a locally correct inference but cannot establish the target', () => {
  const report = run(
    input('Q', ['P'], [given(1, 1, 'Q'), infer(2, 'Q', 'reiteration', [1], [1])], ['reiteration']),
  );
  expect(report).toMatchObject({ status: 'needs_review', target: 'not_established' });
  expect(report.steps[1]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'invalid' });
});
test('an erroneous dependency declaration is not trusted to erase support downstream', () => {
  const report = run(
    input(
      'P',
      [],
      [
        assume(1, 'P'),
        infer(2, 'P', 'reiteration', [1], []),
        infer(3, 'P', 'reiteration', [2], []),
      ],
      ['reiteration'],
    ),
  );
  expect(report.target).toBe('not_established');
  expect(report.steps[2]!.dependencyStatus).toBe('invalid');
});
test.each(['unknown', 'self', 'forward'])(
  'rejects %s ordinary citations without following cycles',
  (kind) => {
    const value = direct('reiteration', 'P', ['P']);
    const step = value.proof.steps[1];
    if (step?.kind !== 'inference') throw Error();
    step.lineReferences = [id(kind === 'unknown' ? 900 : kind === 'self' ? 2 : 3)];
    value.proof.steps.push(assume(3, 'P'));
    expect(run(value).steps[1]!.localStatus).toBe('invalid');
  },
);
test.each(['premise', 'reversed', 'future', 'missing', 'duplicate'])(
  'rejects %s discharge endpoints',
  (kind) => {
    const value = cases();
    const last = value.proof.steps[7];
    if (last?.kind !== 'inference') throw Error();
    if (kind === 'premise') last.discharges[0]!.assumptionId = id(1);
    if (kind === 'reversed') last.discharges[0]!.conclusionId = id(2);
    if (kind === 'future') last.discharges[0]!.conclusionId = id(8);
    if (kind === 'missing') last.discharges[0]!.conclusionId = id(900);
    if (kind === 'duplicate') last.discharges[1] = { ...last.discharges[0]! };
    expect(run(value).steps[7]!.localStatus).toBe('invalid');
  },
);
test('unfinished discharge preserves an unknown target instead of a score', () => {
  const value = input(
    'P -> P',
    [],
    [assume(1, 'P'), infer(2, 'P -> P', 'implication_introduction')],
    ['implication_introduction'],
  );
  const step = value.proof.steps[1];
  if (step?.kind !== 'inference') throw Error();
  step.discharges = [{ assumptionId: id(1), conclusionId: null }];
  expect(run(value)).toMatchObject({ status: 'needs_review', target: 'unknown' });
  expect(run(value).steps[1]!.localStatus).toBe('unassessable');
});
test('unused mistakes still require review even with an independently established final target', () => {
  const report = run(
    input(
      'P',
      ['P'],
      [
        given(1, 1, 'P'),
        infer(2, 'Q', 'reiteration', [1], [1]),
        infer(3, 'P', 'reiteration', [1], [1]),
      ],
      ['reiteration'],
    ),
  );
  expect(report).toMatchObject({ status: 'needs_review', target: 'established' });
});
test('the actual final line controls the target and temporary assumptions cannot become theorems', () => {
  expect(run(input('P', [], [assume(1, 'P')], [])).target).toBe('not_established');
  expect(run(input('P', ['P'], [given(1, 1, 'P'), assume(2, 'Q')], [])).target).toBe(
    'not_established',
  );
});
test.each(['disabled', 'unknown', 'arity', 'blank-rule', 'blank-formula', 'bad-formula'])(
  'reports %s local work independently of transport validity',
  (kind) => {
    const value = direct('reiteration', 'P', ['P']);
    const step = value.proof.steps[1];
    if (step?.kind !== 'inference') throw Error();
    if (kind === 'disabled') value.problem.permittedRuleIds = [];
    if (kind === 'unknown') step.ruleId = 'not_a_rule';
    if (kind === 'arity') step.lineReferences = [];
    if (kind === 'blank-rule') step.ruleId = null;
    if (kind === 'blank-formula') step.formula = '';
    if (kind === 'bad-formula') step.formula = 'P &';
    const report = run(value);
    expect(report.status).toBe('needs_review');
    expect(report.steps[1]!.localStatus).toBe(
      kind.startsWith('blank') ? 'unassessable' : 'invalid',
    );
  },
);
test('duplicate source IDs are ambiguous structure, while empty work stays incomplete', () => {
  const value = direct('reiteration', 'P', ['P']);
  value.proof.steps[1]!.id = value.proof.steps[0]!.id;
  expect(analyzeDependencyStructure(value.proof).status).toBe('invalid');
  expect(run(value).status).toBe('needs_review');
  expect(run(input('P', [], [], []))).toMatchObject({
    status: 'needs_review',
    target: 'not_established',
  });
});
test('bad configurations and unsupported formats/versions remain unassessable', () => {
  const value = direct('reiteration', 'P', ['P']);
  for (const malformed of [
    { ...value, problem: { ...value.problem, ruleCatalogVersion: 2 } },
    { ...value, proof: { ...value.proof, proofVersion: 2 } },
    { ...value, proof: { ...value.proof, format: 'tree' } },
    { ...value, problem: { ...value.problem, permittedRuleIds: ['unknown_rule'] } },
    {
      ...value,
      problem: {
        ...value.problem,
        premises: [value.problem.premises[0], value.problem.premises[0]],
      },
    },
  ])
    expect(run(malformed).status).toBe('unassessable');
  expect(checkProof(value).status).toBe('unassessable');
});
test('resource and diagnostic exhaustion never return partial success', () => {
  const value = direct('reiteration', 'P', ['P']);
  expect(
    run({ ...value, proof: { ...value.proof, steps: Array(PROOF_LIMITS.maxSteps + 1) } })
      .diagnostics[0]!.code,
  ).toBe('RESOURCE_LIMIT');
  expect(
    run({ ...value, problem: { ...value.problem, conclusion: 'P'.repeat(257) } }).diagnostics[0]!
      .code,
  ).toBe('RESOURCE_LIMIT');
  const noisy = input(
    'P',
    [],
    Array.from({ length: 200 }, (_, i) =>
      infer(i + 1, 'P', 'reiteration', [], Array(200).fill(900)),
    ),
    ['reiteration'],
  );
  expect(run(noisy)).toMatchObject({ status: 'unassessable', target: 'unknown', steps: [] });
  expect(run(noisy).diagnostics.at(-1)!.code).toBe('RESOURCE_LIMIT');
  const formula = Array(128).fill('P').join('&');
  const expensive = input(
    formula,
    [formula],
    [
      given(1, 1, formula),
      ...Array.from({ length: 199 }, (_, i) => infer(i + 2, formula, 'reiteration', [i + 1], [1])),
    ],
    ['reiteration'],
  );
  expect(run(expensive)).toMatchObject({ status: 'unassessable', target: 'unknown', steps: [] });
});
test('untrusted objects, accessor lists and custom iterators are rejected without invocation', () => {
  const value = direct('reiteration', 'P', ['P']);
  let invoked = false;
  const steps: unknown[] = [];
  Object.defineProperty(steps, '0', {
    get() {
      invoked = true;
      return value.proof.steps[0];
    },
    enumerable: true,
  });
  expect(run({ ...value, proof: { ...value.proof, steps } }).status).toBe('unassessable');
  expect(invoked).toBe(false);
  const hostile = [...value.proof.steps];
  Object.defineProperty(hostile, Symbol.iterator, {
    value() {
      invoked = true;
      throw Error();
    },
  });
  expect(run({ ...value, proof: { ...value.proof, steps: hostile } }).status).toBe('unassessable');
  expect(invoked).toBe(false);
  expect(
    run({
      get problem() {
        invoked = true;
        return value.problem;
      },
      proof: value.proof,
    }).status,
  ).toBe('unassessable');
  expect(invoked).toBe(false);
  const cycle: Record<string, unknown> = { ...value };
  cycle.extra = cycle;
  expect(run(cycle).status).toBe('unassessable');
  expect(run(new Date()).status).toBe('unassessable');
});
test('checking preserves input, normalizes references and returns no scores or authoritative statement', () => {
  const value = direct('reiteration', '~P', ['!P']);
  value.proof.steps[0]!.id = value.proof.steps[0]!.id.toUpperCase();
  const before = structuredClone(value);
  const result = run(value);
  expect(result.status).toBe('accepted');
  expect(run(value)).toEqual(result);
  expect(value).toEqual(before);
  expect(result).not.toHaveProperty('score');
  expect(result).not.toHaveProperty('problem');
});

test('repeated ordinary citations are legal while dependency annotations remain a set', () => {
  expect(
    run(
      input(
        'P & P',
        ['P'],
        [given(1, 1, 'P'), infer(2, 'P & P', 'and_introduction', [1, 1], [1])],
        ['and_introduction'],
      ),
    ).status,
  ).toBe('accepted');
});

test('unused valid assumptions do not create an implicit global box scope', () => {
  expect(
    run(
      input(
        'P',
        ['P'],
        [given(1, 1, 'P'), assume(2, 'Q'), infer(3, 'P', 'reiteration', [1], [1])],
        ['reiteration'],
      ),
    ).status,
  ).toBe('accepted');
});

test('both input readers reject non-enumerable object accessors and array accessors without invoking them', () => {
  const dependency = direct('reiteration', 'P', ['P']);
  const fitch = {
    problem: dependency.problem,
    proof: {
      proofVersion: 1,
      format: 'fitch',
      blocks: [],
      steps: [{ kind: 'premise', id: id(1), blockId: null, formula: 'P', premiseId: id(1001) }],
    },
  };
  for (const [checker, value] of [
    [checkDependencyProof, dependency],
    [checkProof, fitch],
  ] as const) {
    let calls = 0;
    const outer = { proof: value.proof };
    Object.defineProperty(outer, 'problem', {
      get() {
        calls++;
        return value.problem;
      },
    });
    expect(checker(outer).status).toBe('unassessable');
    const steps: unknown[] = [];
    Object.defineProperty(steps, '0', {
      get() {
        calls++;
        return value.proof.steps[0];
      },
      enumerable: true,
    });
    expect(checker({ ...value, proof: { ...value.proof, steps } }).status).toBe('unassessable');
    expect(calls).toBe(0);
  }
});

test.each([false, true])(
  'unresolved earlier references preserve unknown/invalid support rather than inventing an empty set (%s)',
  (invalid) => {
    const value = input(
      'P -> P',
      [],
      [
        assume(1, 'P'),
        infer(2, 'P -> P', 'implication_introduction'),
        infer(3, 'P -> P', 'reiteration', [2], []),
      ],
      ['implication_introduction', 'reiteration'],
    );
    const earlier = value.proof.steps[1];
    if (earlier?.kind !== 'inference') throw Error();
    earlier.discharges = [{ assumptionId: id(1), conclusionId: invalid ? id(900) : null }];
    const report = run(value);
    expect(report.status).toBe('needs_review');
    expect(report.steps[2]).toMatchObject({
      localStatus: 'valid',
      dependencyStatus: invalid ? 'invalid' : 'unknown',
    });
    expect(report.target).toBe(invalid ? 'not_established' : 'unknown');
  },
);
