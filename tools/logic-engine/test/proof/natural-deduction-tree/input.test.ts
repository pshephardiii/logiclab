import { checkNaturalDeductionTreeProof } from '../../../src/proof';
import { proofCheckReportSchema, PROOF_LIMITS } from '@logiclab/contracts';
import { identity } from './fixtures';

function rejected(value: unknown) {
  const result = checkNaturalDeductionTreeProof(value);
  expect(proofCheckReportSchema.safeParse(result).success).toBe(true);
  expect(result.status).toBe('unassessable');
  expect(result.steps).toEqual([]);
}

test.each([null, [], 1, 'proof', {}, { problem: {}, proof: {} }])(
  'rejects malformed input: %j',
  rejected,
);

test('object and array accessors are rejected without invocation', () => {
  const value = identity();
  let calls = 0;
  for (const enumerable of [true, false]) {
    const outer = { proof: value.proof };
    Object.defineProperty(outer, 'problem', {
      enumerable,
      get() {
        calls++;
        return value.problem;
      },
    });
    rejected(outer);
    const nodes: unknown[] = [];
    Object.defineProperty(nodes, '0', {
      enumerable,
      get() {
        calls++;
        return value.proof.nodes[0];
      },
    });
    rejected({ ...value, proof: { ...value.proof, nodes } });
    const branch = { assumptionIds: [] };
    Object.defineProperty(branch, 'rootId', {
      enumerable,
      get() {
        calls++;
        return value.proof.rootId;
      },
    });
    rejected({
      ...value,
      proof: { ...value.proof, nodes: [{ ...value.proof.nodes[1], branches: [branch] }] },
    });
  }
  expect(calls).toBe(0);
});

test('custom iterators, holes and prototypes are not traversed', () => {
  const value = identity();
  let calls = 0;
  const nodes = [...value.proof.nodes];
  Object.defineProperty(nodes, Symbol.iterator, {
    value() {
      calls++;
      throw Error();
    },
  });
  rejected({ ...value, proof: { ...value.proof, nodes } });
  rejected({ ...value, proof: { ...value.proof, nodes: Array(2) } });
  rejected(Object.assign(Object.create({}), value));
  expect(calls).toBe(0);
});

test('unknown cyclic fields, private evidence and incompatible format fields are rejected safely', () => {
  const value = identity();
  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  for (const fields of [
    { extra: cyclic },
    { report: { status: 'accepted' } },
    { referenceProof: value.proof },
    { blocks: [] },
  ])
    rejected({ ...value, proof: { ...value.proof, ...fields } });
});

test('oversized branch IDs, formulas and selections fail before schema recursion', () => {
  const value = identity();
  for (const fields of [
    { rootId: 'a'.repeat(37) },
    { assumptionFormula: 'P'.repeat(PROOF_LIMITS.maxFormulaLength + 1) },
    { assumptionIds: Array(PROOF_LIMITS.maxSteps + 1) },
  ]) {
    const node = value.proof.nodes[1]!;
    if (node.kind !== 'inference') throw Error('Fixture needs an inference.');
    rejected({
      ...value,
      proof: {
        ...value.proof,
        nodes: [{ ...node, branches: [{ ...node.branches[0], ...fields }] }],
      },
    });
  }
});
