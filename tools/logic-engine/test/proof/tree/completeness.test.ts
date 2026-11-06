import { expect, test } from '@jest/globals';
import { PROOF_LIMITS } from '@logiclab/contracts';
import { isFinishedTreeProofAttempt, checkTreeProof } from '../../../src/proof';
import { id, given, assume, branch, infer, input, identity } from './fixtures';

test('a valid identity and a single supplied premise are finished attempts', () => {
  expect(isFinishedTreeProofAttempt(identity())).toBe(true);
  expect(isFinishedTreeProofAttempt(input('P', ['P'], [given(1, 1, 'P')], []))).toBe(true);
});

test('a fully filled but invalid rule application is finished and remains flagged by verification', () => {
  const value = input(
    'Q',
    ['P'],
    [given(1, 1, 'P'), infer(2, 'Q', 'reiteration', [1])],
    ['reiteration'],
  );
  expect(isFinishedTreeProofAttempt(value)).toBe(true);
  expect(checkTreeProof(value).status).toBe('needs_review');
});

test('filling the target as a false premise claim counts as finished, never verified', () => {
  const value = input('Q', ['P'], [given(1, 1, 'Q')], []);
  expect(isFinishedTreeProofAttempt(value)).toBe(true);
  expect(checkTreeProof(value).status).toBe('needs_review');
});

test('wrong, omitted and vacuous assumption discharge are checked separately from finished fields', () => {
  const wrong = identity();
  wrong.proof.nodes[0]!.formula = 'Q';
  expect(isFinishedTreeProofAttempt(wrong)).toBe(true);
  expect(checkTreeProof(wrong).status).toBe('needs_review');
  const open = identity();
  open.proof.nodes[1] = infer(2, 'P -> P', 'implication_introduction', [], [branch(1, 'P', [])]);
  expect(isFinishedTreeProofAttempt(open)).toBe(true);
  expect(checkTreeProof(open).status).toBe('needs_review');
  const vacuous = input(
    'Q -> P',
    ['P'],
    [given(1, 1, 'P'), infer(2, 'Q -> P', 'implication_introduction', [], [branch(1, 'Q', [])])],
    ['implication_introduction'],
  );
  expect(isFinishedTreeProofAttempt(vacuous)).toBe(true);
  expect(checkTreeProof(vacuous).status).toBe('accepted');
});

test('nonblank intermediate syntax mistakes are retained for post-submission verification', () => {
  const value = identity();
  value.proof.nodes[0]!.formula = 'P &';
  expect(isFinishedTreeProofAttempt(value)).toBe(true);
  expect(checkTreeProof(value).diagnostics.some((item) => item.code === 'INVALID_FORMULA')).toBe(
    true,
  );
});

test.each([
  'empty',
  'root',
  'target',
  'assumption_root',
  'formula',
  'rule',
  'disabled_rule',
  'arity',
  'branch_root',
  'branch_formula',
  'premise',
  'foreign_premise',
] as const)('rejects unfinished %s fields', (kind) => {
  const value = identity();
  if (kind === 'empty') value.proof = { ...value.proof, rootId: null, nodes: [] };
  if (kind === 'root') value.proof.rootId = null;
  if (kind === 'target') value.problem.conclusion = 'Q';
  if (kind === 'assumption_root') {
    value.proof = { ...value.proof, rootId: id(1), nodes: [assume(1, 'P')] };
    value.problem.conclusion = 'P';
  }
  if (kind === 'formula') value.proof.nodes[0]!.formula = ' ';
  if (kind === 'rule') value.proof.nodes[1] = infer(2, 'P -> P', null, [], [branch(1, 'P', [1])]);
  if (kind === 'disabled_rule') value.problem.permittedRuleIds = [];
  if (kind === 'arity') {
    value.problem.permittedRuleIds.push('and_introduction');
    value.proof.nodes[1] = infer(2, 'P -> P', 'and_introduction', [1]);
  }
  if (kind === 'branch_root')
    value.proof.nodes[1] = infer(
      2,
      'P -> P',
      'implication_introduction',
      [],
      [{ rootId: null, assumptionFormula: 'P', assumptionIds: [id(1)] }],
    );
  if (kind === 'branch_formula')
    value.proof.nodes[1] = infer(
      2,
      'P -> P',
      'implication_introduction',
      [],
      [branch(1, ' ', [1])],
    );
  if (kind === 'premise' || kind === 'foreign_premise') {
    const node = given(1, 1, 'P');
    if (node.kind !== 'premise') throw Error();
    node.premiseId = kind === 'premise' ? null : id(500);
    value.proof = { ...value.proof, rootId: node.id, nodes: [node] };
    value.problem.conclusion = 'P';
  }
  expect(isFinishedTreeProofAttempt(value)).toBe(false);
});

test.each([
  'cycle',
  'shared',
  'duplicate',
  'disconnected',
  'missing_child',
  'missing_assumption',
] as const)('a %s graph is not a finished strict tree', (kind) => {
  const value = identity();
  if (kind === 'cycle') value.proof.nodes[1] = infer(2, 'P -> P', 'reiteration', [2]);
  if (kind === 'shared') value.proof.nodes[1] = infer(2, 'P -> P', 'and_introduction', [1, 1]);
  if (kind === 'duplicate') value.proof.nodes.push(value.proof.nodes[0]!);
  if (kind === 'disconnected') value.proof.nodes.push(assume(3, 'Q'));
  if (kind === 'missing_child')
    value.proof.nodes[1] = infer(
      2,
      'P -> P',
      'implication_introduction',
      [],
      [branch(999, 'P', [1])],
    );
  if (kind === 'missing_assumption')
    value.proof.nodes[1] = infer(
      2,
      'P -> P',
      'implication_introduction',
      [],
      [branch(1, 'P', [999])],
    );
  expect(isFinishedTreeProofAttempt(value)).toBe(false);
});

test('unsupported versions, malformed configuration and resource failures return false', () => {
  const value = identity();
  for (const invalid of [
    null,
    {},
    { ...value, proof: { ...value.proof, proofVersion: 2 } },
    { ...value, problem: { ...value.problem, permittedRuleIds: ['unknown_rule'] } },
    { ...value, proof: { ...value.proof, nodes: Array(PROOF_LIMITS.maxSteps + 1) } },
    { ...value, problem: { ...value.problem, conclusion: '!'.repeat(33) + 'P' } },
  ])
    expect(isFinishedTreeProofAttempt(invalid)).toBe(false);
});

test('completion uses the selected root, not array order, without modifying the attempt', () => {
  const value = identity();
  value.proof.nodes.reverse();
  const before = structuredClone(value);
  expect(isFinishedTreeProofAttempt(value)).toBe(true);
  expect(value).toEqual(before);
});
