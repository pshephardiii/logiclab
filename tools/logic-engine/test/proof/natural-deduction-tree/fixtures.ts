import type {
  NaturalDeductionTreeProofCheckInput,
  NaturalDeductionTreeProofNode,
  NaturalDeductionTreeProofBranch,
} from '@logiclab/contracts';

export const id = (n: number) => `${n.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`;
export const given = (n: number, slot: number, formula: string): NaturalDeductionTreeProofNode => ({
  kind: 'premise',
  id: id(n),
  premiseId: id(1000 + slot),
  formula,
});
export const assume = (n: number, formula: string): NaturalDeductionTreeProofNode => ({
  kind: 'assumption',
  id: id(n),
  formula,
});
export const branch = (
  root: number,
  assumptionFormula: string,
  assumptions: number[],
): NaturalDeductionTreeProofBranch => ({
  rootId: id(root),
  assumptionFormula,
  assumptionIds: assumptions.map(id),
});
export const infer = (
  n: number,
  formula: string,
  ruleId: string | null,
  children: number[] = [],
  branches: NaturalDeductionTreeProofBranch[] = [],
): Extract<NaturalDeductionTreeProofNode, { kind: 'inference' }> => ({
  kind: 'inference',
  id: id(n),
  formula,
  ruleId,
  lineReferences: children.map(id),
  branches,
});
export function input(
  conclusion: string,
  premises: string[],
  nodes: NaturalDeductionTreeProofNode[],
  rules: string[],
): NaturalDeductionTreeProofCheckInput {
  return {
    problem: {
      ruleCatalogVersion: 1,
      conclusion,
      premises: premises.map((formula, index) => ({ id: id(1001 + index), formula })),
      permittedRuleIds: rules,
    },
    proof: { proofVersion: 1, format: 'tree', rootId: nodes.at(-1)?.id ?? null, nodes },
  };
}
export function direct(rule: string, conclusion: string, premises: string[]) {
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
      ),
    ],
    [rule],
  );
}
export function identity() {
  return input(
    'P -> P',
    [],
    [assume(1, 'P'), infer(2, 'P -> P', 'implication_introduction', [], [branch(1, 'P', [1])])],
    ['implication_introduction'],
  );
}
