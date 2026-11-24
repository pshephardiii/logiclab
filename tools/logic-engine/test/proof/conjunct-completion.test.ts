import type { FitchProofCheckInput, DependencyProofCheckInput } from '@logiclab/contracts';
import {
  checkFitchProof,
  checkDependencyProof,
  isFinishedFitchProofAttempt,
  isFinishedDependencyProofAttempt,
} from '../../src/proof';

const id = (n: number) => `${n.toString(16).padStart(8, '0')}-bbbb-4bbb-8bbb-bbbbbbbbbbbb`;

function fixture(format: 'fitch' | 'dependency', source = 'P & Q & R') {
  const problem = {
    ruleCatalogVersion: 2 as const,
    formulaGroupingVersion: 1 as const,
    premises: [{ id: id(100), formula: source }],
    conclusion: 'P',
    permittedRuleIds: ['and_chain_elimination', 'reiteration', 'excluded_middle'],
  };
  const fitch: FitchProofCheckInput = {
    problem,
    proof: {
      proofVersion: 2,
      format: 'fitch',
      blocks: [],
      steps: [
        { kind: 'premise', id: id(1), premiseId: id(100), blockId: null, formula: source },
        {
          kind: 'inference',
          id: id(2),
          blockId: null,
          formula: 'P',
          ruleId: 'and_chain_elimination',
          conjunctIndex: 0,
          lineReferences: [id(1)],
          subproofReferences: [],
        },
      ],
    },
  };
  const dependency: DependencyProofCheckInput = {
    problem,
    proof: {
      proofVersion: 2,
      format: 'dependency',
      steps: [
        { kind: 'premise', id: id(1), premiseId: id(100), formula: source, dependencies: [id(1)] },
        {
          kind: 'inference',
          id: id(2),
          formula: 'P',
          ruleId: 'and_chain_elimination',
          conjunctIndex: 0,
          lineReferences: [id(1)],
          discharges: [],
          dependencies: [id(1)],
        },
      ],
    },
  };
  const value = format === 'fitch' ? fitch : dependency;
  const selection = value.proof.steps[1]!;
  if (selection.kind !== 'inference') throw new Error('Expected inference');
  function insert(index: number, step: typeof selection) {
    if (value.proof.format === 'fitch' && 'blockId' in step)
      value.proof.steps.splice(index, 0, step);
    else if (value.proof.format === 'dependency' && 'dependencies' in step)
      value.proof.steps.splice(index, 0, step);
    else throw new Error('Mismatched proof format');
  }
  function finished() {
    const before = structuredClone(value);
    const result = (
      format === 'fitch' ? isFinishedFitchProofAttempt : isFinishedDependencyProofAttempt
    )(value);
    expect(value).toEqual(before);
    return result;
  }
  return {
    value,
    problem,
    fitch,
    dependency,
    selection,
    insert,
    finished,
    check: () => (format === 'fitch' ? checkFitchProof : checkDependencyProof)(value),
  };
}

for (const format of ['fitch', 'dependency'] as const) {
  test(`${format} a meaningful but incorrect extraction is finished without becoming verified`, () => {
    const f = fixture(format);
    expect(f.finished()).toBe(true);
    expect(f.check().status).toBe('accepted');
    f.selection.conjunctIndex = 1; // A real choice, but Q does not match the entered P.
    expect(f.finished()).toBe(true);
    expect(f.check()).toMatchObject({ status: 'needs_review', target: 'not_established' });
  });

  test.each([undefined, null, -1, 0.5, 3, 256])(
    `${format} missing or nonexistent selection %s is unfinished`,
    (index) => {
      const f = fixture(format);
      f.selection.conjunctIndex = index;
      expect(f.finished()).toBe(false);
    },
  );

  test.each(['P', 'P v Q', '!P', 'P &'])(
    `${format} %s supplies no meaningful conjunct position`,
    (source) => {
      const f = fixture(format);
      f.value.proof.steps[0]!.formula = source;
      expect(f.finished()).toBe(false);
    },
  );

  test(`${format} pinned boundaries determine positions even when premise text erases them`, () => {
    const f = fixture(format, '(P & Q) & R');
    f.value.proof.steps[0]!.formula = 'P & Q & R';
    f.selection.conjunctIndex = 2;
    expect(f.finished()).toBe(false); // Only two original members exist.
    f.selection.conjunctIndex = 0;
    expect(f.finished()).toBe(true); // Selected (P & Q), entered P: a finished mistake.
    expect(f.check().status).toBe('needs_review');
  });

  test(`${format} copied source boundaries survive into completion's available positions`, () => {
    const f = fixture(format, '(P & Q) & R');
    const source = { ...f.selection, id: id(3), formula: 'P & Q & R', ruleId: 'reiteration' };
    delete source.conjunctIndex;
    f.insert(1, source);
    f.selection.lineReferences = [id(3)];
    f.selection.conjunctIndex = 2;
    expect(f.finished()).toBe(false);
    f.selection.conjunctIndex = 0;
    expect(f.finished()).toBe(true);
  });

  test.each([0, 1])(
    `${format} selected equal-looking member %s retains its own later choices`,
    (member) => {
      const f = fixture(format, '((P & Q) & R) & (P & Q & R)');
      const first = { ...f.selection, id: id(3), formula: 'P & Q & R', conjunctIndex: member };
      f.insert(1, first);
      f.selection.lineReferences = [id(3)];
      f.selection.conjunctIndex = 2;
      f.selection.formula = 'R';
      f.problem.conclusion = 'R';
      expect(f.finished()).toBe(member === 1);
    },
  );

  test(`${format} an unrelated filled syntax mistake remains reviewable rather than hiding a finished attempt`, () => {
    const f = fixture(format);
    const wrong = {
      ...f.selection,
      id: id(3),
      formula: 'P &',
      ruleId: 'excluded_middle',
      lineReferences: [],
    };
    delete wrong.conjunctIndex;
    if ('dependencies' in wrong) wrong.dependencies = [];
    f.insert(1, wrong);
    expect(f.finished()).toBe(true);
    expect(f.check().status).toBe('needs_review');
  });

  test(`${format} filled incorrect references are reviewable when their selected source still has that member`, () => {
    const f = fixture(format);
    f.selection.formula = 'P & Q & R';
    f.problem.conclusion = 'P & Q & R';
    f.selection.lineReferences = [f.selection.id];
    expect(f.finished()).toBe(true);
    expect(f.check().status).toBe('needs_review');
  });

  test(`${format} a forward citation stays reviewable without erasing its later premise's boundaries`, () => {
    const f = fixture(format, '(P & Q) & R');
    f.value.proof.steps[0]!.formula = 'P & Q & R';
    f.value.proof.steps.reverse();
    const final = { ...f.selection, id: id(3), ruleId: 'reiteration', lineReferences: [id(2)] };
    delete final.conjunctIndex;
    f.insert(2, final);
    expect(f.finished()).toBe(true);
    expect(f.check().status).toBe('needs_review');
    f.selection.conjunctIndex = 2;
    expect(f.finished()).toBe(false);
  });

  test(`${format} catalog-2 ordinary work retains reviewable nonfinal syntax mistakes`, () => {
    const f = fixture(format);
    f.selection.ruleId = 'reiteration';
    delete f.selection.conjunctIndex;
    f.value.proof.steps[0]!.formula = 'P &';
    expect(f.finished()).toBe(true);
    expect(f.check().status).toBe('needs_review');
  });

  test(`${format} rule, target and field completeness still apply independently of conjunct selection`, () => {
    const f = fixture(format);
    f.problem.permittedRuleIds = ['reiteration'];
    expect(f.finished()).toBe(false);
    f.problem.permittedRuleIds = ['and_chain_elimination'];
    f.selection.lineReferences = [];
    expect(f.finished()).toBe(false);
    f.selection.lineReferences = [id(99)];
    expect(f.finished()).toBe(false);
    f.selection.lineReferences = [id(1)];
    f.selection.formula = '';
    expect(f.finished()).toBe(false);
    f.selection.formula = 'Q';
    expect(f.finished()).toBe(false);
    f.selection.formula = 'P';
    expect(f.finished()).toBe(true);
    f.selection.ruleId = 'reiteration';
    f.problem.permittedRuleIds = ['reiteration'];
    expect(f.finished()).toBe(false); // Another rule cannot carry a conjunct field.
    delete f.selection.conjunctIndex;
    expect(f.finished()).toBe(true); // Wrong reiteration, with every actual field filled.
  });

  test(`${format} an unavailable inherited source or work budget never becomes certified completion`, () => {
    const f = fixture(format, '(P & Q) & R');
    f.value.proof.steps[0]!.formula = 'P & Q & R'.padEnd(256, ' ');
    expect(f.finished()).toBe(false);

    const heavy = fixture(format, Array(128).fill('P').join('&'));
    const chain = heavy.value.proof.steps[0]!.formula;
    const copied = { ...heavy.selection, ruleId: 'reiteration', formula: chain };
    delete copied.conjunctIndex;
    for (let i = 0; i < 175; i++) heavy.insert(1, { ...copied, id: id(10 + i) });
    expect(heavy.finished()).toBe(false);
  });
}

test('catalog-2 completion keeps wrong dependency annotations for post-submission review', () => {
  const f = fixture('dependency');
  f.dependency.proof.steps[1]!.dependencies = [];
  expect(f.finished()).toBe(true);
  expect(f.check().steps[1]!.dependencyStatus).toBe('invalid');
});

test('catalog-2 Fitch work still needs every started box closed and a root-level final target', () => {
  const f = fixture('fitch');
  f.fitch.proof.steps.splice(1, 0, {
    id: id(3),
    kind: 'assumption',
    blockId: id(20),
    formula: 'Q',
  });
  f.fitch.proof.blocks = [{ id: id(20), parentId: null, assumptionId: id(3), endId: null }];
  expect(f.finished()).toBe(false);
  f.fitch.proof.blocks[0]!.endId = id(3);
  expect(f.finished()).toBe(true);
  f.fitch.proof.steps.at(-1)!.blockId = id(20);
  expect(f.finished()).toBe(false);
});
