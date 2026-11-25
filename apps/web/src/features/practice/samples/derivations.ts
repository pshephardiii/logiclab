import { ProblemType } from '@logiclab/contracts/problem-type';
import type { FitchProof, DependencyProof } from '@logiclab/contracts';
import type { FitchDerivationContent } from '@logiclab/contracts/derivation';
import type { DependencyDerivationContent } from '@logiclab/contracts/dependency-derivation';
import { sampleId, sampleStage } from './stage';

/** The same small argument in both formats, with only the three rules the example uses. */
function statement(): Omit<FitchDerivationContent, 'format'> {
  return {
    type: ProblemType.Derivation,
    definitionVersion: 1,
    checkerVersion: 1,
    ruleCatalogVersion: 2,
    formulaGroupingVersion: 1,
    premises: [{ id: sampleId(1), formula: 'P → Q' }],
    conclusion: 'P → (P ∧ Q)',
    rules: [
      { id: 'implication_elimination', label: 'Implication elimination' },
      { id: 'and_introduction', label: 'Conjunction introduction' },
      { id: 'implication_introduction', label: 'Implication introduction' },
    ],
  };
}

const introduction =
  'Let P mean “it is raining” and Q mean “the ground is wet”. Given that rain implies wet ground, show that rain implies both rain and wet ground.';

export function createFitchSample() {
  const content: FitchDerivationContent = { ...statement(), format: 'fitch' };
  const premise = sampleId(11);
  const assumption = sampleId(12);
  const wet = sampleId(13);
  const both = sampleId(14);
  const conclusion = sampleId(15);
  const block = sampleId(16);
  const proof: FitchProof = {
    proofVersion: 2,
    format: 'fitch',
    steps: [
      { id: premise, kind: 'premise', formula: 'P → Q', premiseId: sampleId(1), blockId: null },
    ],
    blocks: [],
  };
  const stages = [
    sampleStage('The premise is given. Our conclusion is shown above the proof.', proof),
  ];

  proof.steps.push({ id: assumption, kind: 'assumption', formula: 'P', blockId: block });
  proof.blocks.push({ id: block, parentId: null, assumptionId: assumption, endId: null });
  stages.push(sampleStage('Temporarily assume P: suppose it is raining.', proof));

  proof.steps.push({
    id: wet,
    kind: 'inference',
    formula: 'Q',
    blockId: block,
    ruleId: 'implication_elimination',
    lineReferences: [premise, assumption],
    subproofReferences: [],
  });
  stages.push(sampleStage('From P → Q and P, infer Q: the ground is wet.', proof));

  proof.steps.push({
    id: both,
    kind: 'inference',
    formula: 'P ∧ Q',
    blockId: block,
    ruleId: 'and_introduction',
    lineReferences: [assumption, wet],
    subproofReferences: [],
  });
  stages.push(sampleStage('Combine P and Q to obtain P ∧ Q.', proof));

  proof.blocks[0]!.endId = both;
  stages.push(sampleStage('Close the subproof: assuming P led to P ∧ Q.', proof));

  proof.steps.push({
    id: conclusion,
    kind: 'inference',
    formula: content.conclusion,
    blockId: null,
    ruleId: 'implication_introduction',
    lineReferences: [],
    subproofReferences: [block],
  });
  stages.push(sampleStage('Discharge the temporary assumption and infer P → (P ∧ Q).', proof));

  return {
    id: 'rain-fitch',
    title: 'From rain to rain and wet ground',
    introduction,
    statement: content,
    stages,
    completed: structuredClone(proof),
  };
}

export function createDependencySample() {
  const content: DependencyDerivationContent = { ...statement(), format: 'dependency' };
  const premise = sampleId(21);
  const assumption = sampleId(22);
  const wet = sampleId(23);
  const both = sampleId(24);
  const conclusion = sampleId(25);
  const proof: DependencyProof = {
    proofVersion: 2,
    format: 'dependency',
    steps: [
      {
        id: premise,
        kind: 'premise',
        formula: 'P → Q',
        premiseId: sampleId(1),
        dependencies: [premise],
      },
    ],
  };
  const stages = [sampleStage('The given premise depends on itself, line 1.', proof)];

  proof.steps.push({
    id: assumption,
    kind: 'assumption',
    formula: 'P',
    dependencies: [assumption],
  });
  stages.push(
    sampleStage('Assume P temporarily. This assumption depends on itself, line 2.', proof),
  );

  proof.steps.push({
    id: wet,
    kind: 'inference',
    formula: 'Q',
    dependencies: [premise, assumption],
    ruleId: 'implication_elimination',
    lineReferences: [premise, assumption],
    discharges: [],
  });
  stages.push(sampleStage('Infer Q using lines 1 and 2; both remain dependencies.', proof));

  proof.steps.push({
    id: both,
    kind: 'inference',
    formula: 'P ∧ Q',
    dependencies: [premise, assumption],
    ruleId: 'and_introduction',
    lineReferences: [assumption, wet],
    discharges: [],
  });
  stages.push(sampleStage('Combine P and Q. The result still depends on lines 1 and 2.', proof));

  proof.steps.push({
    id: conclusion,
    kind: 'inference',
    formula: content.conclusion,
    dependencies: [premise],
    ruleId: 'implication_introduction',
    lineReferences: [],
    discharges: [{ assumptionId: assumption, conclusionId: both }],
  });
  stages.push(
    sampleStage(
      'Discharge assumption 2. The conclusion depends only on the given premise, line 1.',
      proof,
    ),
  );

  return {
    id: 'rain-dependency',
    title: 'From rain to rain and wet ground',
    introduction,
    statement: content,
    stages,
    completed: structuredClone(proof),
  };
}

export type ProofSample =
  ReturnType<typeof createFitchSample> | ReturnType<typeof createDependencySample>;
