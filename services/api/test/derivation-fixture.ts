import type { DependencyDerivationDefinition } from '@logiclab/contracts/dependency-derivation';
import type { FitchDerivationDefinition } from '@logiclab/contracts/derivation';
import type { NaturalDeductionTreeDerivationDefinition } from '@logiclab/contracts/natural-deduction-tree-derivation';

const a = 'a1111111-1111-4111-8111-111111111111';
const b = 'b2222222-2222-4222-8222-222222222222';
const c = 'c3333333-3333-4333-8333-333333333333';
export function naturalDeductionTreeDefinitionFixture(): NaturalDeductionTreeDerivationDefinition {
  return {
    ...derivationDefinitionFixture(),
    format: 'tree',
    ruleCatalogVersion: 1,
    referenceProof: {
      proofVersion: 1,
      format: 'tree',
      rootId: b,
      nodes: [
        { kind: 'assumption', id: a, formula: 'P' },
        {
          kind: 'inference',
          id: b,
          formula: 'P -> P',
          ruleId: 'implication_introduction',
          lineReferences: [],
          branches: [{ rootId: a, assumptionFormula: 'P', assumptionIds: [a] }],
        },
      ],
    },
  };
}

export function derivationDefinitionFixture(): FitchDerivationDefinition {
  return {
    type: 'derivation',
    definitionVersion: 1,
    format: 'fitch',
    ruleCatalogVersion: 1,
    checkerVersion: 1,
    premises: [],
    conclusion: 'P -> P',
    rules: [{ id: 'implication_introduction', label: 'Conditional proof' }],
    referenceProof: {
      proofVersion: 1,
      format: 'fitch',
      steps: [
        { kind: 'assumption', id: a, blockId: c, formula: 'P' },
        {
          kind: 'inference',
          id: b,
          blockId: null,
          formula: 'P -> P',
          ruleId: 'implication_introduction',
          lineReferences: [],
          subproofReferences: [c],
        },
      ],
      blocks: [{ id: c, parentId: null, assumptionId: a, endId: a }],
    },
    explanation: 'Assuming P permits deriving P and discharging the assumption.',
  };
}

export function dependencyDefinitionFixture(): DependencyDerivationDefinition {
  return {
    ...derivationDefinitionFixture(),
    format: 'dependency',
    referenceProof: {
      proofVersion: 1,
      format: 'dependency',
      steps: [
        { kind: 'assumption', id: a, formula: 'P', dependencies: [a] },
        {
          kind: 'inference',
          id: b,
          formula: 'P -> P',
          dependencies: [],
          ruleId: 'implication_introduction',
          lineReferences: [],
          discharges: [{ assumptionId: a, conclusionId: a }],
        },
      ],
    },
  };
}

export function fitchChainDefinitionFixture(): FitchDerivationDefinition {
  return {
    ...derivationDefinitionFixture(),
    ruleCatalogVersion: 2,
    formulaGroupingVersion: 1,
    premises: [{ id: a, formula: 'P & Q & R' }],
    conclusion: 'P',
    rules: [
      { id: 'and_chain_elimination', label: 'Conjunct extraction' },
      { id: 'reiteration', label: 'Copy' },
    ],
    referenceProof: {
      proofVersion: 2,
      format: 'fitch',
      blocks: [],
      steps: [
        { id: b, kind: 'premise', blockId: null, premiseId: a, formula: 'P & Q & R' },
        {
          id: c,
          kind: 'inference',
          blockId: null,
          formula: 'P',
          ruleId: 'and_chain_elimination',
          conjunctIndex: 0,
          lineReferences: [b],
          subproofReferences: [],
        },
      ],
    },
    explanation: 'PRIVATE_CHAIN_REFERENCE',
  };
}

export function dependencyChainDefinitionFixture(): DependencyDerivationDefinition {
  return {
    ...fitchChainDefinitionFixture(),
    format: 'dependency',
    referenceProof: {
      proofVersion: 2,
      format: 'dependency',
      steps: [
        { id: b, kind: 'premise', premiseId: a, formula: 'P & Q & R', dependencies: [b] },
        {
          id: c,
          kind: 'inference',
          formula: 'P',
          ruleId: 'and_chain_elimination',
          conjunctIndex: 0,
          lineReferences: [b],
          discharges: [],
          dependencies: [b],
        },
      ],
    },
  };
}
