import {
  fitchProofSchema,
  proofCheckInputSchema,
  proofCheckReportSchema,
  proofDiagnosticSchema,
  PROOF_LIMITS,
  problemDefinitionSchema,
  type FitchProof,
  type ProofCheckReport,
} from '@logiclab/contracts';
import {
  PROOF_FORMULA_LIMITS,
  checkLocalRule,
  analyzeFitchStructure,
  parseProofFormula,
  type LocalRuleApplication,
} from '@logiclab/logic-engine/proof';

const a = 'a1111111-1111-4111-8111-111111111111';
const b = 'b2222222-2222-4222-8222-222222222222';
const c = 'c3333333-3333-4333-8333-333333333333';
const proof: FitchProof = {
  proofVersion: 1,
  format: 'fitch',
  steps: [
    {
      kind: 'inference',
      id: a,
      blockId: null,
      formula: '',
      ruleId: null,
      lineReferences: [],
      subproofReferences: [],
    },
  ],
  blocks: [],
};
const input = {
  problem: {
    ruleCatalogVersion: 1,
    premises: [{ id: b, formula: 'P' }],
    conclusion: 'P',
    permittedRuleIds: ['reiteration'],
  },
  proof,
};
const accepted: ProofCheckReport = {
  checkerVersion: 1,
  ruleCatalogVersion: 1,
  status: 'accepted',
  target: 'established',
  steps: [{ stepId: a, stepIndex: 0, localStatus: 'valid', dependencyStatus: 'valid' }],
  diagnostics: [],
};

test('proof contracts retain bounded incomplete work without validating its logic', () => {
  expect(proofCheckInputSchema.parse(input)).toEqual(input);
  const partial = {
    ...proof,
    steps: [
      { kind: 'assumption', id: a, blockId: b, formula: 'P &' },
      {
        kind: 'inference',
        id: c,
        blockId: b,
        formula: '',
        ruleId: 'unknown_rule',
        lineReferences: [a],
        subproofReferences: [],
      },
    ],
    blocks: [{ id: b, parentId: null, assumptionId: a, endId: null }],
  };
  expect(fitchProofSchema.parse(partial)).toEqual(partial);
});

test('IDs normalize without rewriting formulas or retargeting references', () => {
  const parsed = fitchProofSchema.parse({
    ...proof,
    steps: [
      { ...proof.steps[0], id: a.toUpperCase(), formula: ' P ', lineReferences: [b.toUpperCase()] },
    ],
  });
  expect(parsed.steps[0]).toMatchObject({ id: a, formula: ' P ', lineReferences: [b] });
});

test('duplicate and missing identities remain reportable structural errors, not recursive JSON', () => {
  const malformed = {
    ...proof,
    steps: [proof.steps[0], proof.steps[0]],
    blocks: [{ id: b, parentId: b, assumptionId: a, endId: c }],
  };
  expect(fitchProofSchema.safeParse(malformed).success).toBe(true);
  expect(
    fitchProofSchema.safeParse({ ...proof, steps: [{ ...proof.steps[0], children: [proof] }] })
      .success,
  ).toBe(false);
});

test.each([
  { ...proof, proofVersion: 2 },
  { ...proof, format: 'tree' },
  { ...proof, score: 100 },
  { ...proof, steps: Array.from({ length: 201 }, () => proof.steps[0]) },
  {
    ...proof,
    blocks: Array.from({ length: 65 }, () => ({
      id: b,
      parentId: null,
      assumptionId: a,
      endId: null,
    })),
  },
  { ...proof, steps: [{ ...proof.steps[0], formula: 'P'.repeat(257) }] },
  { ...proof, steps: [{ ...proof.steps[0], ruleId: 'Modus ponens' }] },
  { ...proof, steps: [{ ...proof.steps[0], lineReferences: [a, b, c] }] },
  { ...proof, steps: [{ ...proof.steps[0], id: 'line 1' }] },
  { ...proof, steps: [{ kind: 'premise', id: a, blockId: b, premiseId: c, formula: 'P' }] },
])('proof contracts reject unsupported/unbounded transport: %#', (value) => {
  expect(fitchProofSchema.safeParse(value).success).toBe(false);
});

test('problem statements and catalog versions are strict without inventing permission defaults', () => {
  expect(
    proofCheckInputSchema.safeParse({
      ...input,
      problem: { ...input.problem, ruleCatalogVersion: 2 },
    }).success,
  ).toBe(false);
  expect(
    proofCheckInputSchema.safeParse({
      ...input,
      problem: { ...input.problem, permittedRuleIds: undefined },
    }).success,
  ).toBe(false);
  expect(
    proofCheckInputSchema.parse({ ...input, problem: { ...input.problem, permittedRuleIds: [] } })
      .problem.permittedRuleIds,
  ).toEqual([]);
  expect(PROOF_LIMITS.maxFormulaLength).toBe(PROOF_FORMULA_LIMITS.maxLength);
  expect(
    fitchProofSchema.safeParse({
      ...proof,
      steps: Array.from({ length: 200 }, () => proof.steps[0]),
    }).success,
  ).toBe(true);
});

test.each([
  { ...accepted, target: 'unknown' },
  { ...accepted, steps: [] },
  {
    ...accepted,
    diagnostics: [{ code: 'RULE_MISMATCH', message: 'Unused invalid line', stepIndex: 0 }],
  },
  { ...accepted, steps: [{ ...accepted.steps[0], localStatus: 'invalid' }] },
  { ...accepted, steps: [{ ...accepted.steps[0], dependencyStatus: 'invalid' }] },
  { ...accepted, steps: [{ ...accepted.steps[0], dependencyStatus: 'unknown' }] },
  { ...accepted, steps: [accepted.steps[0], accepted.steps[0]] },
  { ...accepted, steps: [accepted.steps[0], { ...accepted.steps[0], stepIndex: 1 }] },
  { ...accepted, steps: [{ ...accepted.steps[0], stepIndex: 1 }] },
  { ...accepted, earnedPoints: 0 },
])('accepted reports cannot hide errors or unresolved work: %#', (value) => {
  expect(proofCheckReportSchema.safeParse(value).success).toBe(false);
});

test('reports preserve local validity separately from invalid upstream dependencies', () => {
  const report: ProofCheckReport = {
    ...accepted,
    status: 'needs_review',
    target: 'not_established',
    steps: [{ stepId: c, stepIndex: 1, localStatus: 'valid', dependencyStatus: 'invalid' }],
    diagnostics: [
      { code: 'INVALID_DEPENDENCY', message: 'Depends on an invalid earlier step.', stepIndex: 1 },
    ],
  };
  expect(proofCheckReportSchema.parse(report)).toEqual(report);
  expect(
    proofCheckReportSchema.safeParse({
      ...accepted,
      status: 'unassessable',
      target: 'unknown',
      steps: [],
    }).success,
  ).toBe(false);
  expect(
    proofCheckReportSchema.parse({
      ...accepted,
      status: 'unassessable',
      target: 'unknown',
      steps: [],
      diagnostics: [{ code: 'RESOURCE_LIMIT', message: 'Checking budget exceeded.' }],
    }).status,
  ).toBe('unassessable');
  expect(
    proofCheckReportSchema.safeParse({
      ...report,
      diagnostics: Array.from({ length: 501 }, () => report.diagnostics[0]),
    }).success,
  ).toBe(false);
  expect(proofCheckReportSchema.parse(accepted)).toEqual(accepted);
});

test('foundation contracts do not enable authored derivation definitions', () => {
  expect(
    problemDefinitionSchema.safeParse({ type: 'derivation', definitionVersion: 1, ...input })
      .success,
  ).toBe(false);
});

test('local rule outcomes map to diagnostic contracts without becoming whole-proof reports', () => {
  const application: LocalRuleApplication = {
    ruleCatalogVersion: 1,
    ruleId: 'reiteration',
    permittedRuleIds: ['reiteration'],
    conclusion: parseProofFormula('P'),
    lines: [parseProofFormula('P')],
    subproofs: [],
  };
  for (const input of [
    { ...application, ruleCatalogVersion: 2 },
    { ...application, ruleId: null },
    { ...application, ruleId: 'unknown_rule' },
    { ...application, permittedRuleIds: [] },
    { ...application, lines: [] },
    { ...application, conclusion: parseProofFormula('Q') },
  ]) {
    const result = checkLocalRule(input);
    expect(result.status).not.toBe('valid');
    if (result.status !== 'valid')
      expect(
        proofDiagnosticSchema.safeParse({
          code: result.code,
          message: 'Local inference diagnostic.',
        }).success,
      ).toBe(true);
  }
  const local = checkLocalRule(application);
  expect(local).toEqual({ status: 'valid' });
  expect(proofCheckReportSchema.safeParse(local).success).toBe(false);
});

test('Fitch structure diagnostics share contracts but resolved structure is not an accepted report', () => {
  const result = analyzeFitchStructure(fitchProofSchema.parse(proof));
  expect(result.status).toBe('resolved');
  expect(proofCheckReportSchema.safeParse(result).success).toBe(false);
  const invalid = analyzeFitchStructure(
    fitchProofSchema.parse({ ...proof, steps: [{ ...proof.steps[0], lineReferences: [a] }] }),
  );
  expect(invalid.diagnostics.length).toBeGreaterThan(0);
  for (const diagnostic of invalid.diagnostics)
    expect(proofDiagnosticSchema.safeParse(diagnostic).success).toBe(true);
});
