import { proofCheckReportSchema, PROOF_LIMITS, type TreeProofNode } from '@logiclab/contracts';
import { checkTreeProof, checkFitchProof, checkDependencyProof } from '../../../src/proof';
import { id, given, assume, branch, infer, input, direct, identity } from './fixtures';

function run(value: unknown) {
  const result = checkTreeProof(value);
  expect(proofCheckReportSchema.safeParse(result).success).toBe(true);
  return result;
}
const directCases: [string, string, string[]][] = [
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
];

test.each(directCases)(
  'accepts %s with Fitch/dependency formula-pattern parity',
  (rule, conclusion, premises) => {
    const value = direct(rule, conclusion, premises);
    expect(run(value).status).toBe('accepted');
    const fitchSteps = value.proof.nodes.map((node) => {
      if (node.kind !== 'inference') return { ...node, blockId: null };
      const { branches: _branches, ...fields } = node;
      return { ...fields, blockId: null, subproofReferences: [] };
    });
    expect(
      checkFitchProof({
        problem: value.problem,
        proof: { proofVersion: 1, format: 'fitch', steps: fitchSteps, blocks: [] },
      }).status,
    ).toBe('accepted');
    const dependencySteps = value.proof.nodes.map((node) => {
      const dependencies =
        node.kind === 'premise'
          ? [node.id]
          : value.proof.nodes.filter((node) => node.kind === 'premise').map((node) => node.id);
      if (node.kind === 'inference') {
        const { branches: _branches, ...fields } = node;
        return { ...fields, dependencies, discharges: [] };
      }
      return { ...node, dependencies };
    });
    expect(
      checkDependencyProof({
        problem: value.problem,
        proof: { proofVersion: 1, format: 'dependency', steps: dependencySteps },
      }).status,
    ).toBe('accepted');
  },
);

test.each(directCases)('rejects a formula mismatch for %s', (rule, conclusion, premises) => {
  const value = direct(rule, conclusion, premises);
  value.proof.nodes[value.proof.nodes.length - 1]!.formula = 'Z';
  // Explosion permits any conclusion; its failing case needs a non-contradiction operand.
  if (rule === 'contradiction_elimination') {
    value.proof.nodes[0]!.formula = 'P';
    value.problem.premises[0]!.formula = 'P';
  }
  expect(run(value).status).toBe('needs_review');
  expect(run(value).diagnostics.some((d) => d.code === 'RULE_MISMATCH')).toBe(true);
});

test('conditional introduction discharges its assumption leaf', () => {
  expect(run(identity())).toMatchObject({ status: 'accepted', target: 'established' });
});

test.each([
  ['negation_introduction', 'P', '!P', '!P'],
  ['proof_by_contradiction', '!P', 'P', 'P'],
])(
  '%s checks an explicitly discharged contradiction branch',
  (rule, assumption, premise, conclusion) => {
    const value = input(
      conclusion,
      [premise],
      [
        assume(1, assumption),
        given(2, 1, premise),
        infer(3, '⊥', 'contradiction_introduction', [1, 2]),
        infer(4, conclusion, rule, [], [branch(3, assumption, [1])]),
      ],
      [rule, 'contradiction_introduction'],
    );
    expect(run(value).status).toBe('accepted');
    value.proof.nodes[2]!.formula = 'Q';
    expect(run(value).status).toBe('needs_review');
  },
);

test('proof by cases closes separate case occurrences', () => {
  const value = input(
    'P | Q',
    ['P | Q'],
    [
      given(1, 1, 'P | Q'),
      assume(2, 'P'),
      infer(3, 'P | Q', 'or_introduction', [2]),
      assume(4, 'Q'),
      infer(5, 'P | Q', 'or_introduction', [4]),
      infer(6, 'P | Q', 'or_elimination', [1], [branch(3, 'P', [2]), branch(5, 'Q', [4])]),
    ],
    ['or_introduction', 'or_elimination'],
  );
  expect(run(value).status).toBe('accepted');
});

test('repeated premises and assumptions require independent occurrences', () => {
  expect(
    run(
      input(
        'P & P',
        ['P'],
        [given(1, 1, 'P'), given(2, 1, 'P'), infer(3, 'P & P', 'and_introduction', [1, 2])],
        ['and_introduction'],
      ),
    ).status,
  ).toBe('accepted');
  const value = input(
    'P -> (P & P)',
    [],
    [
      assume(1, 'P'),
      assume(2, 'P'),
      infer(3, 'P & P', 'and_introduction', [1, 2]),
      infer(4, 'P -> (P & P)', 'implication_introduction', [], [branch(3, 'P', [1, 2])]),
    ],
    ['and_introduction', 'implication_introduction'],
  );
  expect(run(value).status).toBe('accepted');
  value.proof.nodes[3] = infer(
    4,
    'P -> (P & P)',
    'implication_introduction',
    [],
    [branch(3, 'P', [1])],
  );
  expect(run(value)).toMatchObject({ status: 'needs_review', target: 'not_established' });
});

test('vacuous discharge retains the stated assumption formula', () => {
  const value = input(
    'Q -> P',
    ['P'],
    [given(1, 1, 'P'), infer(2, 'Q -> P', 'implication_introduction', [], [branch(1, 'Q', [])])],
    ['implication_introduction'],
  );
  expect(run(value).status).toBe('accepted');
  value.proof.nodes[1] = infer(2, 'Q -> P', 'implication_introduction', [], [branch(1, 'R', [])]);
  expect(run(value).status).toBe('needs_review');
});

test.each(['Q', 'P'])(
  'nested discharge closes only selected occurrences, including equal formulas (%s)',
  (inner) => {
    const value = input(
      `P -> (${inner} -> (P & ${inner}))`,
      [],
      [
        assume(1, 'P'),
        assume(2, inner),
        infer(3, `P & ${inner}`, 'and_introduction', [1, 2]),
        infer(
          4,
          `${inner} -> (P & ${inner})`,
          'implication_introduction',
          [],
          [branch(3, inner, [2])],
        ),
        infer(
          5,
          `P -> (${inner} -> (P & ${inner}))`,
          'implication_introduction',
          [],
          [branch(4, 'P', [1])],
        ),
      ],
      ['and_introduction', 'implication_introduction'],
    );
    expect(run(value).status).toBe('accepted');
  },
);

test('an already closed assumption cannot be discharged again', () => {
  const value = identity();
  value.problem.conclusion = 'P -> (P -> P)';
  value.proof.nodes.push(
    infer(3, 'P -> (P -> P)', 'implication_introduction', [], [branch(2, 'P', [1])]),
  );
  value.proof.rootId = id(3);
  expect(run(value).diagnostics.some((d) => d.code === 'INVALID_DEPENDENCY')).toBe(true);
  expect(run(value).status).toBe('needs_review');
});

test('equal formulas do not permit cross-branch discharge', () => {
  const value = input(
    'P',
    ['P | P'],
    [
      given(1, 1, 'P | P'),
      assume(2, 'P'),
      assume(3, 'P'),
      infer(4, 'P', 'or_elimination', [1], [branch(2, 'P', [3]), branch(3, 'P', [2])]),
    ],
    ['or_elimination'],
  );
  expect(run(value).status).toBe('needs_review');
  expect(run(value).diagnostics.some((d) => d.code === 'INVALID_DEPENDENCY')).toBe(true);
});

test('an assumption formula mismatch cannot close an otherwise valid branch', () => {
  const value = input(
    'Q -> P',
    [],
    [assume(1, 'P'), infer(2, 'Q -> P', 'implication_introduction', [], [branch(1, 'Q', [1])])],
    ['implication_introduction'],
  );
  const result = run(value);
  expect(result.steps[1]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'invalid' });
  expect(result.target).toBe('not_established');
});

test('case discharge never erases the ordinary child’s open assumptions', () => {
  const value = input(
    'R',
    ['R'],
    [
      assume(1, 'P | Q'),
      given(2, 1, 'R'),
      given(3, 1, 'R'),
      infer(4, 'R', 'or_elimination', [1], [branch(2, 'P', []), branch(3, 'Q', [])]),
    ],
    ['or_elimination'],
  );
  expect(run(value)).toMatchObject({ status: 'needs_review', target: 'not_established' });
});

test('a matching assumption alone cannot establish the requested theorem', () => {
  expect(run(input('P', [], [assume(1, 'P')], []))).toMatchObject({
    status: 'needs_review',
    target: 'not_established',
  });
  expect(run(input('P', ['P', 'Q'], [given(1, 1, 'P')], []))).toMatchObject({
    status: 'accepted',
    target: 'established',
  });
});

test('root selection and stable report indices are independent of array order', () => {
  const value = direct('implication_elimination', 'Q', ['P -> Q', 'P']);
  const before = JSON.parse(JSON.stringify(value));
  value.proof.nodes.reverse();
  const reversed = structuredClone(value);
  const result = run(value);
  expect(result.status).toBe('accepted');
  expect(result.steps.map((s) => s.stepId)).toEqual(value.proof.nodes.map((s) => s.id));
  expect(value).toEqual(reversed);
  expect(run(before).status).toBe('accepted');
});

test.each([null, id(999), id(1002)])(
  'premise references cannot invent authoritative support (%s)',
  (premiseId) => {
    const node = { ...given(1, 1, 'P'), premiseId };
    expect(run(input('P', ['P'], [node], [])).status).toBe('needs_review');
  },
);

test('premise formula mismatch taints locally valid downstream work', () => {
  const value = direct('reiteration', 'Q', ['P']);
  value.proof.nodes[0]!.formula = 'Q';
  const result = run(value);
  expect(result.steps[0]!.localStatus).toBe('invalid');
  expect(result.steps[1]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'invalid' });
  expect(result.target).toBe('not_established');
});

test('invalid and blank child formulas propagate distinct support states', () => {
  for (const [formula, dependencyStatus] of [
    ['P &', 'invalid'],
    ['', 'unknown'],
  ] as const) {
    const value = direct('reiteration', 'P', ['P']);
    value.proof.nodes[0]!.formula = formula;
    expect(run(value).steps[1]!.dependencyStatus).toBe(dependencyStatus);
    expect(run(value).status).toBe('needs_review');
  }
});

test.each([
  [null, 'INCOMPLETE_PROOF'],
  ['unknown_rule', 'UNKNOWN_RULE'],
  ['and_introduction', 'RULE_DISABLED'],
])('handles missing, unknown and disabled rule selections (%s)', (rule, code) => {
  const value = input('P', ['P'], [given(1, 1, 'P'), infer(2, 'P', rule, [1])], ['reiteration']);
  expect(run(value).diagnostics.some((d) => d.code === code)).toBe(true);
  expect(run(value).status).toBe('needs_review');
});

test('rule arity and target matching remain independently required', () => {
  expect(
    run(input('P', [], [infer(1, 'P', 'reiteration')], ['reiteration'])).diagnostics.some(
      (d) => d.code === 'INVALID_REFERENCE',
    ),
  ).toBe(true);
  const value = identity();
  value.problem.conclusion = 'Q';
  expect(run(value)).toMatchObject({ status: 'needs_review', target: 'not_established' });
});

test('blank branch assumption formulas and rules cannot be accepted', () => {
  const value = identity();
  value.proof.nodes[1] = infer(2, 'P -> P', null, [], [branch(1, '', [1])]);
  expect(run(value).status).toBe('needs_review');
  expect(run(value).diagnostics.some((d) => d.code === 'INCOMPLETE_PROOF')).toBe(true);
});

test.each([
  ['', 'unknown'],
  ['P &', 'invalid'],
] as const)(
  'branch assumption syntax retains its support state (%s)',
  (formula, dependencyStatus) => {
    const value = input(
      'Q -> P',
      ['P'],
      [
        given(1, 1, 'P'),
        infer(2, 'Q -> P', 'implication_introduction', [], [branch(1, formula, [])]),
      ],
      ['implication_introduction'],
    );
    const result = run(value);
    expect(result.steps[1]!.dependencyStatus).toBe(dependencyStatus);
    expect(result.status).toBe('needs_review');
  },
);

test('unsupported configuration is unassessable, never a zero grade or partial acceptance', () => {
  const value = identity();
  for (const malformed of [
    { ...value, problem: { ...value.problem, ruleCatalogVersion: 2 } },
    { ...value, proof: { ...value.proof, proofVersion: 2 } },
    { ...value, proof: { ...value.proof, format: 'fitch' } },
    { ...value, problem: { ...value.problem, permittedRuleIds: ['unknown_rule'] } },
    {
      ...value,
      problem: {
        ...value.problem,
        permittedRuleIds: ['implication_introduction', 'implication_introduction'],
      },
    },
    { ...value, problem: { ...value.problem, conclusion: 'P &' } },
    {
      ...value,
      problem: {
        ...value.problem,
        premises: [
          { id: id(1001), formula: 'P' },
          { id: id(1001), formula: 'Q' },
        ],
      },
    },
  ])
    expect(run(malformed).status).toBe('unassessable');
  expect(checkFitchProof(value).status).toBe('unassessable');
  expect(checkDependencyProof(value).status).toBe('unassessable');
});

test('node, formula, diagnostic and work exhaustion return bounded unassessable reports', () => {
  const value = identity();
  for (const oversized of [
    { ...value, proof: { ...value.proof, nodes: Array(PROOF_LIMITS.maxSteps + 1) } },
    {
      ...value,
      problem: { ...value.problem, conclusion: 'P'.repeat(PROOF_LIMITS.maxFormulaLength + 1) },
    },
  ])
    expect(run(oversized).diagnostics[0]!.code).toBe('RESOURCE_LIMIT');
  const noisy = input(
    'P',
    [],
    Array.from({ length: 200 }, (_, i) =>
      infer(i + 1, 'P', 'implication_introduction', [], [branch(1000, 'P', Array(200).fill(999))]),
    ),
    ['implication_introduction'],
  );
  expect(run(noisy)).toMatchObject({ status: 'unassessable', target: 'unknown', steps: [] });
  expect(run(noisy).diagnostics.at(-1)!.code).toBe('RESOURCE_LIMIT');
  const formula = Array(128).fill('P').join('&');
  const nodes: TreeProofNode[] = [
    given(1, 1, formula),
    ...Array.from({ length: 199 }, (_, i) => infer(i + 2, formula, 'reiteration', [i + 1])),
  ];
  expect(run(input(formula, [formula], nodes, ['reiteration']))).toMatchObject({
    status: 'unassessable',
    target: 'unknown',
    steps: [],
  });
});

test('maximum-length simple tree is evaluated iteratively', () => {
  const nodes: TreeProofNode[] = [
    given(1, 1, 'P'),
    ...Array.from({ length: PROOF_LIMITS.maxSteps - 1 }, (_, i) =>
      infer(i + 2, 'P', 'reiteration', [i + 1]),
    ),
  ];
  expect(run(input('P', ['P'], nodes, ['reiteration'])).status).toBe('accepted');
});
