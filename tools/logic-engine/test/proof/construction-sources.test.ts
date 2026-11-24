import { formulaChainMembers } from '../../src/parser/grouping';
import { parseProofFormulaWithSyntax, proofConstructionSources } from '../../src/proof';

const id = (n: number) => `${n.toString(16).padStart(8, '0')}-bbbb-4bbb-8bbb-bbbbbbbbbbbb`;

function fixture(format: 'fitch' | 'dependency') {
  const steps = [
    { kind: 'premise', id: id(1), premiseId: id(100), formula: 'P & Q & R' },
    {
      kind: 'inference',
      id: id(2),
      formula: 'P & Q & R',
      ruleId: 'reiteration',
      lineReferences: [id(1)],
    },
    {
      kind: 'inference',
      id: id(3),
      formula: 'Z',
      ruleId: 'and_chain_elimination',
      lineReferences: [id(2)],
      conjunctIndex: 0,
    },
  ];
  return {
    problem: {
      ruleCatalogVersion: 2,
      formulaGroupingVersion: 1,
      premises: [{ id: id(100), formula: '(P & Q) & R' }],
      conclusion: 'P',
      permittedRuleIds: ['reiteration', 'and_chain_elimination'],
    },
    proof:
      format === 'fitch'
        ? {
            proofVersion: 2,
            format,
            blocks: [],
            steps: steps.map((step) => ({
              ...step,
              blockId: null,
              ...(step.kind === 'inference' ? { subproofReferences: [] } : {}),
            })),
          }
        : {
            proofVersion: 2,
            format,
            steps: steps.map((step) => ({
              ...step,
              dependencies: [id(1)],
              ...(step.kind === 'inference' ? { discharges: [] } : {}),
            })),
          },
  };
}

test.each(['fitch', 'dependency'] as const)(
  '%s construction restores pinned and inherited boundaries without returning correctness',
  (format) => {
    const input = fixture(format);
    const before = structuredClone(input);
    const sources = proofConstructionSources(input);
    expect([...sources.keys()]).toEqual([id(1), id(2), id(3)]);
    for (const line of [id(1), id(2)])
      expect(formulaChainMembers(parseProofFormulaWithSyntax(sources.get(line)!))).toHaveLength(2);
    // Even a wrong result is entered source text, not an acceptance or support claim.
    expect(sources.get(id(3))).toBe('Z');
    expect(input).toEqual(before);
  },
);

test.each(['fitch', 'dependency'] as const)(
  '%s incomplete formulas do not hide other sources',
  (format) => {
    const input = fixture(format);
    input.proof.steps[2]!.formula = 'P &';
    const sources = proofConstructionSources(input);
    expect(sources.has(id(1))).toBe(true);
    expect(sources.has(id(2))).toBe(true);
    expect(sources.has(id(3))).toBe(false);
  },
);

test.each(['fitch', 'dependency'] as const)(
  '%s malformed identity/configuration fails closed',
  (format) => {
    const input = fixture(format);
    input.proof.steps[1]!.id = id(1);
    expect(proofConstructionSources(input).size).toBe(0);
    const old = fixture(format);
    old.problem.ruleCatalogVersion = 1;
    old.proof.proofVersion = 1;
    expect(proofConstructionSources(old).size).toBe(0);
    const unknown = fixture(format);
    unknown.problem.permittedRuleIds.push('unknown_rule');
    expect(proofConstructionSources(unknown).size).toBe(0);
  },
);

test.each([
  null,
  {},
  { proof: [] },
  {
    get problem() {
      throw new Error('getter');
    },
  },
])('construction accepts only bounded plain input', (value) => {
  expect(proofConstructionSources(value).size).toBe(0);
});
