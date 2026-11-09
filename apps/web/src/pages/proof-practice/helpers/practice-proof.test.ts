import { expect, test } from 'vitest';
import { practiceStatement, checkPracticeProof, type PracticeProof } from './practice-proof';
import { startFitchProof } from '../../../features/proof/helpers/fitch-editor';
import { startDependencyProof } from '../../../features/proof/dependency/editor';

const premise = { id: '11111111-1111-4111-8111-111111111111', formula: 'P' };
const nodeId = '22222222-2222-4222-8222-222222222222';

test.each(['fitch', 'dependency', 'tree'] as const)(
  '%s checks a self-created proof without a reference or grade',
  (format) => {
    const statement = practiceStatement(format, [premise], 'P', []);
    const proof: PracticeProof =
      format === 'fitch'
        ? startFitchProof(statement)
        : format === 'dependency'
          ? startDependencyProof(statement.premises)
          : {
              proofVersion: 1,
              format: 'tree',
              rootId: nodeId,
              nodes: [{ id: nodeId, kind: 'premise', premiseId: premise.id, formula: 'P' }],
            };
    const before = structuredClone({ statement, proof });
    const report = checkPracticeProof(statement, proof);

    expect(report.status).toBe('accepted');
    expect(report.target).toBe('established');
    expect(report).not.toHaveProperty('score');
    expect(statement).not.toHaveProperty('referenceProof');
    expect({ statement, proof }).toEqual(before);
  },
);

test.each([
  [[{ ...premise, formula: 'P &' }], 'P', [], /Premise 1:/],
  [[premise], 'P &', [], /Conclusion:/],
  [[premise, premise], 'P', [], /identities must be distinct/],
  [[premise], 'P', ['reiteration', 'reiteration'], /only once/],
  [[premise], 'P', ['custom_rule'], /supported propositional catalog/],
] as const)(
  'invalid setup does not become a practice statement',
  (premises, conclusion, rules, message) => {
    expect(() => practiceStatement('fitch', [...premises], conclusion, [...rules])).toThrow(
      message,
    );
  },
);

test('valid syntax is not a promise that the student-selected goal can be derived', () => {
  const statement = practiceStatement('fitch', [premise], 'Q', []);
  const report = checkPracticeProof(statement, startFitchProof(statement));

  expect(report.status).toBe('needs_review');
  expect(report.target).not.toBe('established');
});

test('selected permissions are enforced and rule labels come from the catalog', () => {
  const statement = practiceStatement('fitch', [premise], 'P', []);
  const proof = startFitchProof(statement);
  proof.steps.push({
    id: nodeId,
    kind: 'inference',
    formula: 'P',
    blockId: null,
    ruleId: 'reiteration',
    lineReferences: [proof.steps[0]!.id],
    subproofReferences: [],
  });

  expect(
    checkPracticeProof(statement, proof).diagnostics.some((item) => item.code === 'RULE_DISABLED'),
  ).toBe(true);
  const allowed = practiceStatement('fitch', [premise], 'P', ['reiteration']);
  expect(allowed.rules).toEqual([{ id: 'reiteration', label: 'Reiteration' }]);
  expect(checkPracticeProof(allowed, proof).status).toBe('accepted');
});

test('proofs cannot be checked under a different selected format', () => {
  const statement = practiceStatement('tree', [], 'P -> P', []);
  expect(() => checkPracticeProof(statement, startFitchProof(statement))).toThrow(
    /selected format/,
  );
});

test('proof setup uses the proof grammar and bounds rather than truth-table variable limits', () => {
  expect(
    practiceStatement('tree', [], '[(P <-> ~Q) & (R v S)] -> (T -> _|_)', []).conclusion,
  ).toContain('T');
  expect(() => practiceStatement('fitch', [], 'P'.repeat(257), [])).toThrow();
});
