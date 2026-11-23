import {
  checkFitchProof,
  checkDependencyProof,
  propositionalRuleCatalog,
  isFinishedFitchProofAttempt,
  isFinishedDependencyProofAttempt,
} from '../../src/proof';
import {
  type FitchProofCheckInput,
  type DependencyProofCheckInput,
  proofCheckReportSchema,
  fitchProofCheckInputSchema,
  dependencyProofCheckInputSchema,
} from '@logiclab/contracts';

const id = (n: number) => `${n.toString(16).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;
type Format = 'fitch' | 'dependency';

function fixture(format: Format, premises: string[], target = 'P') {
  const problem = {
    ruleCatalogVersion: 2 as const,
    formulaGroupingVersion: 1 as const,
    premises: premises.map((formula, index) => ({ id: id(1000 + index), formula })),
    conclusion: target,
    permittedRuleIds: propositionalRuleCatalog(2).map((rule) => rule.id as string),
  };
  const fitch: FitchProofCheckInput = {
    problem,
    proof: { format: 'fitch', proofVersion: 2, steps: [], blocks: [] },
  };
  const dependency: DependencyProofCheckInput = {
    problem,
    proof: { format: 'dependency', proofVersion: 2, steps: [] },
  };
  function given(slot: number, formula = premises[slot]!) {
    const n = fitch.proof.steps.length + 1;
    fitch.proof.steps.push({
      id: id(n),
      kind: 'premise',
      premiseId: id(1000 + slot),
      formula,
      blockId: null,
    });
    dependency.proof.steps.push({
      id: id(n),
      kind: 'premise',
      premiseId: id(1000 + slot),
      formula,
      dependencies: [id(n)],
    });
    return n;
  }
  function infer(
    formula: string,
    ruleId: string,
    lines: number[],
    conjunctIndex?: number | null,
    dependencies = premises.map((_, index) => index + 1),
  ) {
    const n = fitch.proof.steps.length + 1;
    const fields = {
      id: id(n),
      kind: 'inference' as const,
      formula,
      ruleId,
      lineReferences: lines.map(id),
      ...(conjunctIndex === undefined ? {} : { conjunctIndex }),
    };
    fitch.proof.steps.push({ ...fields, blockId: null, subproofReferences: [] });
    dependency.proof.steps.push({ ...fields, dependencies: dependencies.map(id), discharges: [] });
    return n;
  }
  const input = format === 'fitch' ? fitch : dependency;
  function check() {
    const before = structuredClone(input);
    const report = format === 'fitch' ? checkFitchProof(input) : checkDependencyProof(input);
    expect(proofCheckReportSchema.parse(report)).toEqual(report);
    expect(report.ruleCatalogVersion).toBe(2);
    expect(input).toEqual(before);
    // Source metadata is internal even in failure reports.
    expect(JSON.stringify(report)).not.toMatch(/derivedSource|conjunctIndex|authoritativeSource/);
    return report;
  }
  return { problem, input, fitch, dependency, given, infer, check };
}

test('catalog-2 Fitch extraction cannot cite a closed subproof from root scope', () => {
  const f = fixture('fitch', []);
  f.fitch.proof.steps.push(
    { id: id(1), kind: 'assumption', blockId: id(20), formula: 'P & Q & R' },
    {
      id: id(2),
      kind: 'inference',
      blockId: id(20),
      formula: 'P',
      ruleId: 'and_chain_elimination',
      conjunctIndex: 0,
      lineReferences: [id(1)],
      subproofReferences: [],
    },
    {
      id: id(3),
      kind: 'inference',
      blockId: null,
      formula: 'P',
      ruleId: 'reiteration',
      lineReferences: [id(2)],
      subproofReferences: [],
    },
  );
  f.fitch.proof.blocks.push({ id: id(20), parentId: null, assumptionId: id(1), endId: id(2) });
  const report = f.check();
  expect(report.status).toBe('needs_review');
  expect(report.diagnostics.some((entry) => entry.code === 'INVALID_REFERENCE')).toBe(true);
});

test('catalog-2 dependency extraction cannot establish an independent target from a temporary assumption', () => {
  const f = fixture('dependency', []);
  f.dependency.proof.steps.push(
    { id: id(1), kind: 'assumption', formula: 'P & Q & R', dependencies: [id(1)] },
    {
      id: id(2),
      kind: 'inference',
      formula: 'P',
      ruleId: 'and_chain_elimination',
      conjunctIndex: 0,
      lineReferences: [id(1)],
      discharges: [],
      dependencies: [id(1)],
    },
  );
  const report = f.check();
  expect(report.steps[1]).toMatchObject({ localStatus: 'valid', dependencyStatus: 'valid' });
  expect(report).toMatchObject({ status: 'needs_review', target: 'not_established' });
  f.dependency.proof.steps[1]!.dependencies = [];
  expect(f.check().steps[1]!.dependencyStatus).toBe('invalid');
});

for (const format of ['fitch', 'dependency'] as const) {
  test(`${format} grouping survives assumptions, discharge and a later application of the conditional`, () => {
    const f = fixture(format, ['(P & Q) & R', 'T']);
    f.given(0);
    f.given(1);
    f.fitch.proof.steps.push({ kind: 'assumption', id: id(3), formula: 'T', blockId: id(20) });
    f.dependency.proof.steps.push({
      kind: 'assumption',
      id: id(3),
      formula: 'T',
      dependencies: [id(3)],
    });
    f.fitch.proof.blocks.push({ id: id(20), parentId: null, assumptionId: id(3), endId: id(5) });
    f.infer('(P & Q & R) & T', 'and_introduction', [1, 3], undefined, [1, 3]);
    f.infer('P & Q & R', 'and_elimination', [4], undefined, [1, 3]);
    f.fitch.proof.steps[3]!.blockId = id(20);
    f.fitch.proof.steps[4]!.blockId = id(20);
    f.infer('T -> (P & Q & R)', 'implication_introduction', [], undefined, [1]);
    const fitchIntro = f.fitch.proof.steps[5]!;
    if (fitchIntro.kind === 'inference') fitchIntro.subproofReferences = [id(20)];
    const dependencyIntro = f.dependency.proof.steps[5]!;
    if (dependencyIntro.kind === 'inference')
      dependencyIntro.discharges = [{ assumptionId: id(3), conclusionId: id(5) }];
    f.infer('P & Q & R', 'implication_elimination', [2, 6]);
    f.infer('P', 'and_chain_elimination', [7], 0);
    const report = f.check();
    expect(
      report.steps
        .slice(0, 7)
        .every((step) => step.localStatus === 'valid' && step.dependencyStatus === 'valid'),
    ).toBe(true);
    expect(report.steps[7]!.localStatus).toBe('invalid');
  });
  test.each([
    ['P & Q & R', 0, 'P'],
    ['P & Q & R', 1, 'Q'],
    ['(P & Q) & R', 0, 'P & Q'],
    ['P & (Q & R)', 1, 'Q & R'],
  ] as const)(
    `${format} accepts explicitly permitted extraction from %s`,
    (source, member, target) => {
      const f = fixture(format, [source], target);
      f.given(0);
      f.infer(target, 'and_chain_elimination', [1], member);
      expect(f.check()).toMatchObject({ status: 'accepted', target: 'established' });
    },
  );

  test(`${format} takes a grouped member onto a line before extracting its interior`, () => {
    const f = fixture(format, ['(P & Q) & R']);
    f.given(0);
    f.infer('P & Q', 'and_chain_elimination', [1], 0);
    f.infer('P', 'and_chain_elimination', [2], 0);
    expect(f.check().status).toBe('accepted');
  });

  test(`${format} removing parentheses from a premise cannot replace authoritative boundaries`, () => {
    const f = fixture(format, ['(P & Q) & R']);
    f.given(0, 'P & Q & R');
    f.infer('P', 'and_chain_elimination', [1], 0);
    const report = f.check();
    expect(report.status).toBe('needs_review');
    expect(report.steps[0]!.localStatus).toBe('valid');
    expect(report.steps[1]!.localStatus).toBe('invalid');
  });

  test.each(['reiteration', 'and_elimination', 'double_negation_elimination'])(
    `${format} %s cannot erase a descendant group`,
    (rule) => {
      const source =
        rule === 'and_elimination'
          ? '((P & Q) & R) & S'
          : rule === 'double_negation_elimination'
            ? '!!((P & Q) & R)'
            : '(P & Q) & R';
      const f = fixture(format, [source]);
      f.given(0);
      f.infer('P & Q & R', rule, [1]);
      f.infer('P', 'and_chain_elimination', [2], 0);
      const report = f.check();
      expect(report.steps[1]!.localStatus).toBe('valid');
      expect(report.steps[2]!.localStatus).toBe('invalid');
      expect(report.status).toBe('needs_review');
    },
  );

  test(`${format} conditional elimination carries the consequent's inner boundaries through reversed citations`, () => {
    const f = fixture(format, ['S -> ((P & Q) & R)', 'S']);
    f.given(0);
    f.given(1);
    f.infer('P & Q & R', 'implication_elimination', [2, 1]);
    f.infer('P', 'and_chain_elimination', [3], 0);
    const report = f.check();
    expect(report.steps[2]!.localStatus).toBe('valid');
    expect(report.steps[3]!.localStatus).toBe('invalid');
  });

  test(`${format} conjunction introduction maps only the successful citation order`, () => {
    const f = fixture(format, ['(P & Q) & R', 'S'], 'S');
    f.given(0);
    f.given(1);
    f.infer('P & Q & R & S', 'and_introduction', [2, 1]);
    f.infer('S', 'and_chain_elimination', [3], 2);
    expect(f.check().status).toBe('accepted');
    f.input.proof.steps.at(-1)!.formula = 'P';
    f.problem.conclusion = 'P';
    const last = f.input.proof.steps.at(-1)!;
    if (last.kind === 'inference') last.conjunctIndex = 0;
    expect(f.check().steps.at(-1)!.localStatus).toBe('invalid');
  });

  test(`${format} grouping survives addition and subsequent disjunctive syllogism`, () => {
    const f = fixture(format, ['(P & Q) & R', '!S']);
    f.given(0);
    f.given(1);
    f.infer('(P & Q & R) v S', 'or_introduction', [1], undefined, [1]);
    f.infer('P & Q & R', 'disjunctive_syllogism', [2, 3]);
    f.infer('P', 'and_chain_elimination', [4], 0);
    const report = f.check();
    expect(report.steps[2]!.localStatus).toBe('valid');
    expect(report.steps[3]!.localStatus).toBe('valid');
    expect(report.steps[4]!.localStatus).toBe('invalid');
  });

  test(`${format} student-added boundaries also remain authoritative on later lines`, () => {
    const f = fixture(format, ['(P & Q & R) & S']);
    f.given(0);
    f.infer('(P & Q) & R', 'and_chain_elimination', [1], 0);
    f.infer('P', 'and_chain_elimination', [2], 0);
    expect(f.check().steps.at(-1)!.localStatus).toBe('invalid');
  });

  test(`${format} full acceptance requires explicit permission, correct arity and a filled selection`, () => {
    const f = fixture(format, ['P & Q & R']);
    f.given(0);
    f.infer('P', 'and_chain_elimination', [1], 0);
    f.problem.permittedRuleIds = ['reiteration'];
    expect(f.check().diagnostics.some((entry) => entry.code === 'RULE_DISABLED')).toBe(true);
    f.problem.permittedRuleIds = ['and_chain_elimination'];
    const step = f.input.proof.steps[1]!;
    if (step.kind !== 'inference') throw new Error('Expected inference');
    step.lineReferences = [id(1), id(1)];
    expect(f.check().diagnostics.some((entry) => entry.code === 'INVALID_REFERENCE')).toBe(true);
    step.lineReferences = [id(1)];
    step.conjunctIndex = null;
    expect(f.check().steps[1]!.localStatus).toBe('unassessable');
    step.conjunctIndex = 99;
    expect(f.check().steps[1]!.localStatus).toBe('invalid');
  });

  test(`${format} binary elimination remains binary and another rule cannot carry a selection`, () => {
    const f = fixture(format, ['P & Q & R']);
    f.given(0);
    f.infer('P', 'and_elimination', [1]);
    expect(f.check().steps[1]!.localStatus).toBe('invalid');
    f.input.proof.steps[1]!.formula = 'P & Q';
    expect(f.check().status).toBe('needs_review'); // Target remains P.
    const step = f.input.proof.steps[1]!;
    if (step.kind === 'inference') step.conjunctIndex = 0;
    expect(f.check().steps[1]!.localStatus).toBe('invalid');
  });

  test(`${format} target-independent and unused mistakes still need review`, () => {
    const f = fixture(format, ['P & Q & R']);
    f.given(0);
    f.infer('S', 'reiteration', [1]);
    f.infer('P', 'and_chain_elimination', [1], 0);
    const report = f.check();
    expect(report.target).toBe('established');
    expect(report.status).toBe('needs_review');
    if (format === 'dependency') f.dependency.proof.steps[2]!.dependencies = [];
    else {
      const last = f.fitch.proof.steps[2]!;
      if (last.kind === 'inference') last.lineReferences = [id(2)];
    }
    expect(f.check().steps.at(-1)!.dependencyStatus).toBe('invalid');
  });

  test(`${format} resource failure while restoring boundaries never yields partial acceptance`, () => {
    const f = fixture(format, ['(P & Q) & R']);
    f.given(0, 'P & Q & R'.padEnd(256, ' '));
    f.infer('P', 'and_chain_elimination', [1], 0);
    expect(f.check()).toMatchObject({ status: 'unassessable', target: 'unknown', steps: [] });
  });

  test(`${format} excluded middle's internal comparison adds no invented source dependency`, () => {
    const f = fixture(format, [], 'P v !P');
    f.infer('P v !P', 'excluded_middle', [], undefined, []);
    expect(f.check().status).toBe('accepted');
  });

  test(`${format} standalone version-2 input is separate from completion admission`, () => {
    const f = fixture(format, ['P & Q & R']);
    f.given(0);
    f.infer('P', 'and_chain_elimination', [1], 0);
    const schema =
      format === 'fitch' ? fitchProofCheckInputSchema : dependencyProofCheckInputSchema;
    expect(schema.safeParse(f.input).success).toBe(true);
    expect(f.check().status).toBe('accepted');
    expect(
      (format === 'fitch' ? isFinishedFitchProofAttempt : isFinishedDependencyProofAttempt)(
        f.input,
      ),
    ).toBe(false);
  });
}
