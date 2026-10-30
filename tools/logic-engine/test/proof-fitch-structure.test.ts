import {
  fitchProofSchema,
  proofDiagnosticSchema,
  PROOF_LIMITS,
  type FitchProof,
  type ProofStep,
} from '@logiclab/contracts';
import { analyzeFitchStructure, checkLocalRule, parseProofFormula } from '../src/proof';

const id = (n: number) => `${n.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`;
const premise = (n: number, formula = 'P'): ProofStep => ({
  kind: 'premise',
  id: id(n),
  blockId: null,
  formula,
  premiseId: id(1000 + n),
});
const assumption = (n: number, block: number, formula = 'Q'): ProofStep => ({
  kind: 'assumption',
  id: id(n),
  blockId: id(block),
  formula,
});
const inference = (
  n: number,
  block: number | null,
  lines: number[] = [],
  subproofs: number[] = [],
  formula = 'P',
  ruleId = 'reiteration',
): ProofStep => ({
  kind: 'inference',
  id: id(n),
  blockId: block === null ? null : id(block),
  formula,
  ruleId,
  lineReferences: lines.map(id),
  subproofReferences: subproofs.map(id),
});
const block = (n: number, parent: number | null, opening: number, end: number | null) => ({
  id: id(n),
  parentId: parent === null ? null : id(parent),
  assumptionId: id(opening),
  endId: end === null ? null : id(end),
});
const proof = (steps: ProofStep[], blocks: FitchProof['blocks'] = []): FitchProof => ({
  proofVersion: 1,
  format: 'fitch',
  steps,
  blocks,
});
const conditional = () =>
  proof(
    [
      premise(1),
      assumption(2, 101),
      inference(3, 101, [1]),
      inference(4, null, [], [101], 'Q -> P', 'implication_introduction'),
    ],
    [block(101, null, 2, 3)],
  );
const analyze = (value: FitchProof) => analyzeFitchStructure(fitchProofSchema.parse(value));

function nested(depth: number): FitchProof {
  const steps: ProofStep[] = [];
  const blocks: FitchProof['blocks'] = [];
  for (let n = 1; n <= depth; n++) steps.push(assumption(n, 100 + n, 'P'));
  for (let n = depth; n >= 1; n--) {
    const end = depth + (depth - n) + 1;
    steps.push(inference(end, 100 + n, [n]));
    blocks.push(block(100 + n, n === 1 ? null : 99 + n, n, end));
  }
  return proof(steps, blocks);
}

function invalidStructure(value: FitchProof) {
  const result = analyze(value);
  expect(result.status).toBe('invalid');
  expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'INVALID_STRUCTURE')).toBe(
    true,
  );
  expect(result).not.toHaveProperty('references');
}

function badReference(value: FitchProof, stepIndex: number) {
  const result = analyze(value);
  expect(result.status).toBe('resolved');
  if (result.status !== 'resolved') throw new Error('Expected valid layout');
  expect(result.references.find((check) => check.stepIndex === stepIndex)).toEqual({
    status: 'invalid',
    stepIndex,
  });
  expect(
    result.diagnostics.some(
      (diagnostic) => diagnostic.code === 'INVALID_REFERENCE' && diagnostic.stepIndex === stepIndex,
    ),
  ).toBe(true);
}

test('resolved Fitch citations safely feed local patterns without claiming whole-proof acceptance', () => {
  const input = conditional();
  const result = analyze(input);
  expect(result.status).toBe('resolved');
  expect(result.diagnostics).toEqual([]);
  if (result.status !== 'resolved') throw new Error('Expected resolved layout');
  expect(result.references).toEqual([
    { status: 'resolved', stepIndex: 2, lineIndices: [0], subproofs: [] },
    {
      status: 'resolved',
      stepIndex: 3,
      lineIndices: [],
      subproofs: [{ id: id(101), parentId: null, assumptionIndex: 1, endIndex: 2 }],
    },
  ]);
  for (const refs of result.references) {
    if (refs.status !== 'resolved') throw new Error('Expected resolved references');
    const step = input.steps[refs.stepIndex]!;
    if (step.kind !== 'inference') throw new Error('Expected inference');
    expect(
      checkLocalRule({
        ruleCatalogVersion: 1,
        ruleId: step.ruleId,
        permittedRuleIds: ['reiteration', 'implication_introduction'],
        conclusion: parseProofFormula(step.formula),
        lines: refs.lineIndices.map((index) => parseProofFormula(input.steps[index]!.formula)),
        subproofs: refs.subproofs.map((span) => ({
          assumption: parseProofFormula(input.steps[span.assumptionIndex]!.formula),
          conclusion: parseProofFormula(input.steps[span.endIndex]!.formula),
        })),
      }),
    ).toEqual({ status: 'valid' });
  }
});

test('single-line assumption blocks close explicitly and can be cited for A implies A', () => {
  const result = analyze(
    proof(
      [
        assumption(1, 101, 'P'),
        inference(2, null, [], [101], 'P -> P', 'implication_introduction'),
      ],
      [block(101, null, 1, 1)],
    ),
  );
  expect(result.status).toBe('resolved');
  expect(result.diagnostics).toEqual([]);
});

test('nested conditional proofs resolve closed children in their immediate enclosing scope', () => {
  const input = proof(
    [
      assumption(1, 101, 'Q'),
      assumption(2, 102, 'P'),
      inference(3, 101, [], [102], 'P -> P', 'implication_introduction'),
      inference(4, null, [], [101], 'Q -> (P -> P)', 'implication_introduction'),
    ],
    [block(101, null, 1, 3), block(102, 101, 2, 2)],
  );
  const result = analyze(input);
  expect(result.status).toBe('resolved');
  expect(result.diagnostics).toEqual([]);
  if (result.status === 'resolved')
    expect(result.references).toMatchObject([
      { stepIndex: 2, status: 'resolved', subproofs: [{ id: id(102), endIndex: 1 }] },
      { stepIndex: 3, status: 'resolved', subproofs: [{ id: id(101), endIndex: 2 }] },
    ]);
});

test('nested descendants can cite earlier ancestor assumptions and root premises', () => {
  const input = nested(3);
  input.steps.splice(0, 0, premise(50));
  input.steps.splice(3, 0, inference(60, 102, [1, 50], [], 'P & P', 'and_introduction'));
  const result = analyze(input);
  expect(result.status).toBe('resolved');
  expect(result.diagnostics).toEqual([]);
});

test('two closed sibling cases are independently resolved for disjunction elimination', () => {
  const input = proof(
    [
      premise(1, 'P | Q'),
      premise(2, 'R'),
      assumption(3, 101, 'P'),
      inference(4, 101, [2], [], 'R'),
      assumption(5, 102, 'Q'),
      inference(6, 102, [2], [], 'R'),
      inference(7, null, [1], [102, 101], 'R', 'or_elimination'),
    ],
    [block(101, null, 3, 4), block(102, null, 5, 6)],
  );
  const result = analyze(input);
  expect(result.status).toBe('resolved');
  expect(result.diagnostics).toEqual([]);
  if (result.status === 'resolved')
    expect(result.references.at(-1)).toMatchObject({
      status: 'resolved',
      lineIndices: [0],
      subproofs: [{ id: id(102) }, { id: id(101) }],
    });
});

test.each(['missing', 'self', 'future', 'wrong-kind'] as const)(
  'rejects %s line references',
  (kind) => {
    const input = conditional();
    const step = input.steps[2]!;
    if (step.kind !== 'inference') throw new Error('Expected inference');
    step.lineReferences = [
      id(kind === 'missing' ? 999 : kind === 'self' ? 3 : kind === 'future' ? 4 : 101),
    ];
    badReference(input, 2);
  },
);

test('closed child interiors cannot leak to root or a sibling case', () => {
  const input = conditional();
  input.steps.push(inference(5, null, [3]));
  badReference(input, 4);
  input.steps.pop();
  input.steps.splice(3, 0, assumption(5, 102), inference(6, 102, [3]));
  input.blocks.push(block(102, null, 5, 6));
  badReference(input, 4);
});

test('an enclosing scope cannot cite an earlier descendant line after its block closes', () => {
  const input = nested(2);
  const end = input.steps.at(-1)!;
  if (end.kind !== 'inference') throw new Error('Expected inference');
  end.lineReferences = [id(3)];
  badReference(input, 3);
});

test('self, parent and non-direct descendant blocks are inaccessible subproof references', () => {
  const input = nested(2);
  const inner = input.steps[2]!;
  const outer = input.steps[3]!;
  if (inner.kind !== 'inference' || outer.kind !== 'inference')
    throw new Error('Expected inference');
  inner.subproofReferences = [id(102)];
  badReference(input, 2);
  inner.subproofReferences = [id(101)];
  badReference(input, 2);
  inner.subproofReferences = [];
  input.steps.push(inference(5, null, [], [102]));
  badReference(input, 4);
});

test('a closed sibling subproof cannot be discharged from inside another sibling', () => {
  const input = proof(
    [
      assumption(1, 101, 'P'),
      assumption(2, 102, 'Q'),
      inference(3, 102, [], [101], 'P -> P', 'implication_introduction'),
    ],
    [block(101, null, 1, 1), block(102, null, 2, 3)],
  );
  badReference(input, 2);
});

test.each(['future', 'unknown', 'wrong-kind'] as const)(
  'rejects %s subproof references',
  (kind) => {
    const input = conditional();
    const index = kind === 'future' ? 0 : 3;
    const step = kind === 'future' ? inference(1, null, [], [101]) : input.steps[index]!;
    if (step.kind !== 'inference') throw new Error('Expected inference');
    step.subproofReferences = [id(kind === 'future' ? 101 : kind === 'unknown' ? 999 : 1)];
    input.steps[index] = step;
    badReference(input, index);
  },
);

test('disjunction cases cannot cite the same block twice even for identical assumptions', () => {
  const input = conditional();
  const step = input.steps[3]!;
  if (step.kind !== 'inference') throw new Error('Expected inference');
  step.subproofReferences = [id(101), id(101)];
  badReference(input, 3);
});

test('repeated accessible line citations are preserved, not deduplicated', () => {
  const result = analyze(
    proof([premise(1), inference(2, null, [1, 1], [], 'P & P', 'and_introduction')]),
  );
  expect(result.status).toBe('resolved');
  if (result.status === 'resolved')
    expect(result.references[0]).toMatchObject({ status: 'resolved', lineIndices: [0, 0] });
});

test('open blocks retain safe current-scope references but report incomplete work', () => {
  const result = analyze(
    proof([assumption(1, 101, 'P'), inference(2, 101, [1])], [block(101, null, 1, null)]),
  );
  expect(result.status).toBe('resolved');
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({ code: 'INCOMPLETE_PROOF', blockId: id(101) }),
  );
  if (result.status === 'resolved')
    expect(result.references[0]).toMatchObject({ status: 'resolved', lineIndices: [0] });
});

test('a root step cannot silently close a block without an explicit endpoint', () => {
  const input = conditional();
  input.blocks[0]!.endId = null;
  invalidStructure(input);
});

test.each(['steps', 'blocks', 'cross-kind'] as const)('rejects duplicate %s identities', (kind) => {
  const input = conditional();
  if (kind === 'steps') input.steps[3]!.id = input.steps[0]!.id;
  else if (kind === 'blocks') input.blocks.push({ ...input.blocks[0]! });
  else {
    input.blocks[0]!.id = id(2);
    input.steps[1]!.blockId = id(2);
  }
  invalidStructure(input);
});

test.each([
  'unknown-parent',
  'self-parent',
  'parent-cycle',
  'unknown-scope',
  'unclaimed-assumption',
  'missing-assumption',
  'wrong-assumption-kind',
  'missing-end',
  'wrong-end-scope',
  'end-before-opening',
] as const)('rejects malformed layout: %s', (kind) => {
  const input = conditional();
  switch (kind) {
    case 'unknown-parent':
      input.blocks[0]!.parentId = id(999);
      break;
    case 'self-parent':
      input.blocks[0]!.parentId = id(101);
      break;
    case 'parent-cycle':
      input.blocks[0]!.parentId = id(102);
      input.blocks.push(block(102, 101, 5, 5));
      input.steps.push(assumption(5, 102));
      break;
    case 'unknown-scope':
      input.steps[2]!.blockId = id(999);
      break;
    case 'unclaimed-assumption':
      input.steps.splice(2, 0, assumption(5, 101));
      break;
    case 'missing-assumption':
      input.blocks[0]!.assumptionId = id(999);
      break;
    case 'wrong-assumption-kind':
      input.blocks[0]!.assumptionId = id(3);
      break;
    case 'missing-end':
      input.blocks[0]!.endId = id(999);
      break;
    case 'wrong-end-scope':
      input.blocks[0]!.endId = id(4);
      break;
    case 'end-before-opening':
      input.blocks[0]!.endId = id(1);
      break;
  }
  invalidStructure(input);
});

test('parent endpoints cannot be borrowed from nested descendants', () => {
  const input = nested(2);
  input.blocks.find((value) => value.id === id(101))!.endId = id(3);
  invalidStructure(input);
});

test('closed blocks cannot be reopened by later direct steps', () => {
  const input = conditional();
  input.steps.push(inference(5, 101, [2]));
  invalidStructure(input);
});

test('crossing sibling intervals and false parent declarations are rejected', () => {
  const input = conditional();
  input.steps.splice(2, 0, assumption(5, 102));
  input.blocks.push(block(102, null, 5, 5));
  invalidStructure(input);
});

test('nesting budgets are enforced without recursive traversal', () => {
  expect(analyze(nested(PROOF_LIMITS.maxBlockDepth)).diagnostics).toEqual([]);
  const tooDeep = analyze(nested(PROOF_LIMITS.maxBlockDepth + 1));
  expect(tooDeep.status).toBe('unassessable');
  expect(tooDeep.diagnostics.some((diagnostic) => diagnostic.code === 'RESOURCE_LIMIT')).toBe(true);
  expect(tooDeep).not.toHaveProperty('references');
});

test('declared proof and diagnostic budgets never produce a successful partial result', () => {
  const excessive = proof(Array.from({ length: 201 }, (_, index) => premise(index + 1)));
  expect(analyzeFitchStructure(excessive)).toMatchObject({
    status: 'unassessable',
    diagnostics: [{ code: 'RESOURCE_LIMIT' }],
  });
  const excessiveBlocks = proof(
    [],
    Array.from({ length: 65 }, (_, index) => block(100 + index, null, 1, null)),
  );
  expect(analyzeFitchStructure(excessiveBlocks)).toMatchObject({
    status: 'unassessable',
    diagnostics: [{ code: 'RESOURCE_LIMIT' }],
  });
  const noisy = proof(
    Array.from({ length: 200 }, (_, index) => inference(index + 1, null, [900, 901], [902, 903])),
  );
  const result = analyze(noisy);
  expect(result.status).toBe('unassessable');
  expect(result.diagnostics).toHaveLength(PROOF_LIMITS.maxDiagnostics);
  expect(result.diagnostics.at(-1)?.code).toBe('RESOURCE_LIMIT');
  expect(result).not.toHaveProperty('references');
  result.diagnostics.forEach((diagnostic) =>
    expect(proofDiagnosticSchema.safeParse(diagnostic).success).toBe(true),
  );
});

test('unsupported runtime proof headers fail before structural resolution', () => {
  const input = conditional();
  Reflect.set(input, 'proofVersion', 2);
  expect(analyzeFitchStructure(input)).toMatchObject({
    status: 'unassessable',
    diagnostics: [{ code: 'UNSUPPORTED_VERSION' }],
  });
  Reflect.set(input, 'proofVersion', 1);
  Reflect.set(input, 'format', 'tree');
  expect(analyzeFitchStructure(input)).toMatchObject({
    status: 'unassessable',
    diagnostics: [{ code: 'UNSUPPORTED_VERSION' }],
  });
});

test('stable IDs keep citations attached through insertion and block-table reordering', () => {
  const input = nested(2);
  const before = structuredClone(input);
  input.steps.unshift(premise(50));
  input.blocks.reverse();
  const result = analyze(input);
  expect(result.status).toBe('resolved');
  expect(result.diagnostics).toEqual([]);
  if (result.status === 'resolved')
    expect(result.references[0]).toMatchObject({ lineIndices: [2] });
  expect(analyze(before).diagnostics).toEqual([]);
});

test('structure analysis preserves input and does not create grades or accepted reports', () => {
  const input = conditional();
  const before = structuredClone(input);
  const first = analyze(input);
  expect(input).toEqual(before);
  expect(first).not.toHaveProperty('score');
  expect(first.status).toBe('resolved');
  if (first.status === 'resolved') first.blocks[0]!.endIndex = 999;
  expect(analyze(input)).toEqual(analyze(before));
  expect(analyze(proof([]))).toMatchObject({ status: 'resolved', references: [], diagnostics: [] });
});
