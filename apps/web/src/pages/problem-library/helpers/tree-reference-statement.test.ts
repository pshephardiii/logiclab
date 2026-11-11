import { expect, test } from 'vitest';
import type { TreeDerivationDefinition } from '@logiclab/contracts/tree-derivation';
import { treeDerivationDefinition } from '../../../../test/derivation';
import { treeReferenceStatementMatches } from './tree-reference-statement';

function make(): TreeDerivationDefinition {
  return {
    ...structuredClone(treeDerivationDefinition),
    conclusion: '[P → P]',
    premises: [
      { id: 'unused', formula: 'Q' },
      { id: 'source', formula: '~R' },
    ],
  };
}

test('compares target and entered sources structurally without requiring every available premise or checking inference rules', () => {
  const definition = make();
  expect(treeReferenceStatementMatches(definition)).toBe(true);
  definition.referenceProof!.nodes.push(
    { id: 'leaf1', kind: 'premise', formula: '¬R', premiseId: 'source' },
    { id: 'leaf2', kind: 'premise', formula: '!R', premiseId: 'source' },
  );
  const before = structuredClone(definition);
  expect(treeReferenceStatementMatches(definition)).toBe(true);
  expect(definition).toEqual(before);
});

test('detects changed targets, missing roots and outdated or incomplete premise leaves without rewriting work', () => {
  const changes: ((definition: TreeDerivationDefinition) => void)[] = [
    (definition) => {
      definition.conclusion = 'Q';
    },
    (definition) => {
      definition.conclusion = 'P &';
    },
    (definition) => {
      definition.referenceProof!.rootId = null;
    },
    ...[null, 'foreign', 'source'].map((premiseId) => (definition: TreeDerivationDefinition) => {
      definition.referenceProof!.nodes.push({
        id: 'bad',
        kind: 'premise',
        premiseId,
        formula: 'P',
      });
    }),
  ];
  for (const change of changes) {
    const definition = make();
    change(definition);
    const before = structuredClone(definition);
    expect(treeReferenceStatementMatches(definition)).toBe(false);
    expect(definition).toEqual(before);
  }
  expect(treeReferenceStatementMatches({ ...make(), referenceProof: null })).toBe(true);
});
