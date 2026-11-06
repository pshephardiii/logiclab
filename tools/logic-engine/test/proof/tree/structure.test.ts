import { analyzeTreeStructure, checkTreeProof } from '../../../src/proof';
import { proofCheckReportSchema, PROOF_LIMITS } from '@logiclab/contracts';
import { id, given, assume, branch, infer, input, identity } from './fixtures';

test('resolves supporting children before parents without requiring array chronology', () => {
  const value = identity();
  value.proof.nodes.reverse();
  expect(analyzeTreeStructure(value.proof)).toMatchObject({
    status: 'resolved',
    rootIndex: 0,
    postorder: [1, 0],
    references: [
      { lineIndices: [], branches: [{ rootIndex: 1, assumptionIndices: [1] }] },
      { lineIndices: [], branches: [] },
    ],
  });
});

test.each([
  [
    'duplicate node identity',
    () => ({ ...identity().proof, nodes: [assume(1, 'P'), assume(1, 'Q')] }),
  ],
  [
    'shared ordinary child',
    () =>
      input(
        'P & P',
        ['P'],
        [given(1, 1, 'P'), infer(2, 'P & P', 'and_introduction', [1, 1])],
        ['and_introduction'],
      ).proof,
  ],
  [
    'shared discharged child',
    () =>
      input(
        'P',
        [],
        [
          assume(1, 'P'),
          infer(2, 'P', 'or_elimination', [], [branch(1, 'P', [1]), branch(1, 'P', [1])]),
        ],
        ['or_elimination'],
      ).proof,
  ],
  [
    'child shared between ordinary and discharged operands',
    () =>
      input(
        'P',
        [],
        [assume(1, 'P'), infer(2, 'P', 'or_elimination', [1], [branch(1, 'P', [1])])],
        ['or_elimination'],
      ).proof,
  ],
  ['self cycle', () => input('P', [], [infer(1, 'P', 'reiteration', [1])], ['reiteration']).proof],
  [
    'multi-node cycle',
    () =>
      input(
        'P',
        [],
        [infer(1, 'P', 'reiteration', [2]), infer(2, 'P', 'reiteration', [1])],
        ['reiteration'],
      ).proof,
  ],
  [
    'unknown child',
    () => input('P', [], [infer(1, 'P', 'reiteration', [900])], ['reiteration']).proof,
  ],
  [
    'unknown branch',
    () =>
      input(
        'P -> P',
        [],
        [infer(1, 'P -> P', 'implication_introduction', [], [branch(900, 'P', [])])],
        ['implication_introduction'],
      ).proof,
  ],
  ['unknown root', () => ({ ...identity().proof, rootId: id(900) })],
  ['non-root selection', () => ({ ...identity().proof, rootId: id(1) })],
  [
    'disconnected valid work',
    () => ({ ...identity().proof, nodes: [...identity().proof.nodes, assume(3, 'Q')] }),
  ],
  [
    'disconnected cycle',
    () => ({
      ...identity().proof,
      nodes: [
        ...identity().proof.nodes,
        infer(3, 'P', 'reiteration', [4]),
        infer(4, 'P', 'reiteration', [3]),
      ],
    }),
  ],
  [
    'duplicated discharge identity',
    () =>
      input(
        'P -> P',
        [],
        [
          assume(1, 'P'),
          infer(2, 'P -> P', 'implication_introduction', [], [branch(1, 'P', [1, 1])]),
        ],
        ['implication_introduction'],
      ).proof,
  ],
  [
    'unknown discharge identity',
    () =>
      input(
        'P -> P',
        [],
        [
          assume(1, 'P'),
          infer(2, 'P -> P', 'implication_introduction', [], [branch(1, 'P', [900])]),
        ],
        ['implication_introduction'],
      ).proof,
  ],
  [
    'premise discharge',
    () =>
      input(
        'P -> P',
        ['P'],
        [
          given(1, 1, 'P'),
          infer(2, 'P -> P', 'implication_introduction', [], [branch(1, 'P', [1])]),
        ],
        ['implication_introduction'],
      ).proof,
  ],
  [
    'inference discharge',
    () =>
      input(
        'P -> P',
        ['P'],
        [
          given(1, 1, 'P'),
          infer(2, 'P', 'reiteration', [1]),
          infer(3, 'P -> P', 'implication_introduction', [], [branch(2, 'P', [2])]),
        ],
        ['reiteration', 'implication_introduction'],
      ).proof,
  ],
] as const)('rejects %s without resolving a partial valid tree', (_name, create) => {
  const proof = create();
  const before = structuredClone(proof);
  expect(analyzeTreeStructure(proof).status).toBe('invalid');
  const result = checkTreeProof({ ...identity(), proof });
  expect(result.status).toBe('needs_review');
  expect(proofCheckReportSchema.safeParse(result).success).toBe(true);
  expect(proof).toEqual(before);
});

test('empty root and unselected branch remain incomplete rather than accepted', () => {
  const empty = input('P', [], [], []);
  expect(analyzeTreeStructure(empty.proof).status).toBe('incomplete');
  expect(checkTreeProof(empty).status).toBe('needs_review');
  const value = input(
    'P -> P',
    [],
    [
      infer(
        1,
        'P -> P',
        'implication_introduction',
        [],
        [{ rootId: null, assumptionFormula: 'P', assumptionIds: [] }],
      ),
    ],
    ['implication_introduction'],
  );
  expect(analyzeTreeStructure(value.proof).status).toBe('incomplete');
  expect(checkTreeProof(value).status).toBe('needs_review');
});

test('detaching an erroneous unused node cannot produce automatic acceptance', () => {
  const value = identity();
  value.proof.nodes.push(infer(3, 'P &', 'unknown_rule'));
  expect(checkTreeProof(value).status).toBe('needs_review');
});

test('standalone structural analysis enforces bounds and supported versions', () => {
  const value = identity().proof;
  expect(
    analyzeTreeStructure({ ...value, proofVersion: 2 } as unknown as typeof value).status,
  ).toBe('unassessable');
  expect(
    analyzeTreeStructure({ ...value, nodes: Array(PROOF_LIMITS.maxSteps + 1).fill(assume(1, 'P')) })
      .status,
  ).toBe('unassessable');
});

test('node and reference case normalization does not create distinct identities', () => {
  const value = input(
    'P & P',
    ['P'],
    [given(10, 1, 'P'), given(11, 1, 'P'), infer(12, 'P & P', 'and_introduction', [10, 11])],
    ['and_introduction'],
  );
  value.proof.nodes[1]!.id = value.proof.nodes[0]!.id.toUpperCase();
  expect(checkTreeProof(value).status).toBe('needs_review');
});
