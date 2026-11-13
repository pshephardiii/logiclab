import { expect, test } from 'vitest';
import type {
  DependencyProof,
  FitchProof,
  NaturalDeductionTreeProofNode,
} from '@logiclab/contracts';
import {
  PROPOSITIONAL_RULE_CATALOG,
  checkLocalRule,
  parseProofFormula,
  checkFitchProof,
  checkDependencyProof,
  checkNaturalDeductionTreeProof,
  sameFormula,
} from '@logiclab/logic-engine/proof';
import { getRuleReference, RULE_REFERENCE, type ExampleLine } from './rule-reference';

const id = (value: number) => `${value.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`;

/** Test adapters validate the displayed instructional data without adding runtime checking to help. */
function problem(lines: ExampleLine[]) {
  return {
    ruleCatalogVersion: 1 as const,
    premises: lines.flatMap((line, index) =>
      line.kind === 'premise' ? [{ id: id(index + 101), formula: line.formula }] : [],
    ),
    conclusion: lines.at(-1)!.formula,
    permittedRuleIds: [...new Set(lines.flatMap((line) => (line.rule ? [line.rule] : [])))],
  };
}

function fitch(lines: ExampleLine[]): FitchProof {
  return {
    proofVersion: 1,
    format: 'fitch',
    steps: lines.map((line, index) => {
      const base = { id: id(index + 1), formula: line.formula };
      if (line.kind === 'premise')
        return { ...base, kind: 'premise', premiseId: id(index + 101), blockId: null };
      if (line.kind === 'assumption')
        return { ...base, kind: 'assumption', blockId: id(500 + index + 1) };
      return {
        ...base,
        kind: 'inference',
        blockId: line.scope ? id(500 + line.scope) : null,
        ruleId: line.rule!,
        lineReferences: line.citations.map(id),
        subproofReferences: line.discharges.map(([start]) => id(500 + start)),
      };
    }),
    blocks: lines.flatMap((line, index) =>
      line.kind === 'assumption'
        ? [
            {
              id: id(500 + index + 1),
              parentId: null,
              assumptionId: id(index + 1),
              endId: id(
                lines
                  .flatMap((entry) => entry.discharges)
                  .find(([start]) => start === index + 1)![1],
              ),
            },
          ]
        : [],
    ),
  };
}

function dependency(lines: ExampleLine[]): DependencyProof {
  return {
    proofVersion: 1,
    format: 'dependency',
    steps: lines.map((line, index) => {
      const base = {
        id: id(index + 1),
        formula: line.formula,
        dependencies: line.dependencies.map(id),
      };
      if (line.kind === 'premise') return { ...base, kind: 'premise', premiseId: id(index + 101) };
      if (line.kind === 'assumption') return { ...base, kind: 'assumption' };
      return {
        ...base,
        kind: 'inference',
        ruleId: line.rule!,
        lineReferences: line.citations.map(id),
        discharges: line.discharges.map(([start, end]) => ({
          assumptionId: id(start),
          conclusionId: id(end),
        })),
      };
    }),
  };
}

function tree(lines: ExampleLine[]) {
  const nodes: NaturalDeductionTreeProofNode[] = [];
  const origins = new Map<string, number>();
  let counter = 2000;

  function build(position: number): string {
    const line = lines[position - 1]!;
    const nodeId = id(counter++);
    origins.set(nodeId, position);
    const base = { id: nodeId, formula: line.formula };
    if (line.kind === 'premise')
      nodes.push({ ...base, kind: 'premise', premiseId: id(100 + position) });
    else if (line.kind === 'assumption') nodes.push({ ...base, kind: 'assumption' });
    else {
      const lineReferences = line.citations.map(build);
      const branches = line.discharges.map(([start, end]) => {
        const first = nodes.length;
        const rootId = build(end);
        return {
          rootId,
          assumptionFormula: lines[start - 1]!.formula,
          assumptionIds: nodes
            .slice(first)
            .filter((node) => node.kind === 'assumption' && origins.get(node.id) === start)
            .map((node) => node.id),
        };
      });
      nodes.push({ ...base, kind: 'inference', ruleId: line.rule!, lineReferences, branches });
    }
    return nodeId;
  }

  return { proofVersion: 1 as const, format: 'tree' as const, rootId: build(lines.length), nodes };
}

test('reference content covers exactly the versioned catalog', () => {
  expect(Object.keys(RULE_REFERENCE).sort()).toEqual(
    PROPOSITIONAL_RULE_CATALOG.map((rule) => rule.id).sort(),
  );
});

test.each(PROPOSITIONAL_RULE_CATALOG)(
  '$id abstract pattern matches its catalog rule and citation counts',
  (rule) => {
    const guide = getRuleReference(rule.id);
    expect(guide.premises).toHaveLength(rule.lineReferences);
    expect(guide.branches ?? []).toHaveLength(rule.subproofReferences);
    expect(
      checkLocalRule({
        ruleCatalogVersion: 1,
        ruleId: rule.id,
        permittedRuleIds: [rule.id],
        conclusion: parseProofFormula(guide.conclusion),
        lines: guide.premises.map(parseProofFormula),
        subproofs: (guide.branches ?? []).map((branch) => ({
          assumption: parseProofFormula(branch.assumption),
          conclusion: parseProofFormula(branch.conclusion),
        })),
      }),
    ).toEqual({ status: 'valid' });
  },
);

for (const format of ['fitch', 'dependency', 'tree'] as const) {
  test.each(PROPOSITIONAL_RULE_CATALOG)(
    `${format}: $id worked example is accepted by the real checker`,
    (rule) => {
      const lines = getRuleReference(rule.id).example;
      expect(lines.at(-1)!.rule).toBe(rule.id);
      const report =
        format === 'fitch'
          ? checkFitchProof({ problem: problem(lines), proof: fitch(lines) })
          : format === 'dependency'
            ? checkDependencyProof({ problem: problem(lines), proof: dependency(lines) })
            : checkNaturalDeductionTreeProof({ problem: problem(lines), proof: tree(lines) });
      expect(report.diagnostics).toEqual([]);
      expect(report.status).toBe('accepted');
    },
  );
}

test.each([
  ['!P', '¬P'],
  ['~P', '¬P'],
  ['P & Q', 'P ∧ Q'],
  ['P v Q', 'P ∨ Q'],
  ['P | Q', 'P ∨ Q'],
  ['P -> Q', 'P → Q'],
  ['P <-> Q', 'P ↔ Q'],
  ['_|_', '⊥'],
  ['[P & Q]', '(P ∧ Q)'],
])('keyboard guide input %s agrees with %s', (input, symbol) => {
  expect(sameFormula(parseProofFormula(input), parseProofFormula(symbol))).toBe(true);
});
