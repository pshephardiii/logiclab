import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  Problem,
  ProblemVersion,
  User,
  UserRole,
  type DerivationDefinition,
  type createDatabase,
} from '../src/index.ts';

const a = 'a1111111-1111-4111-8111-111111111111';
const b = 'b2222222-2222-4222-8222-222222222222';
const c = 'c3333333-3333-4333-8333-333333333333';
function definition(): DerivationDefinition {
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
    explanation: 'Private reference explanation.',
  };
}

/** Direct JSONB fixtures establish storage compatibility, not live publication permission. */
export function registerDerivationPersistenceTests(
  orm: Awaited<ReturnType<typeof createDatabase>>,
) {
  async function fixture(em: typeof orm.em) {
    const owner = em.create(User, {
      cognitoUserPoolId: 'derivation-persistence',
      cognitoSubject: randomUUID(),
      role: UserRole.Instructor,
    });
    const problem = em.create(Problem, {
      owner,
      title: 'Derivation draft',
      definition: definition(),
    });
    const version = em.create(ProblemVersion, {
      problem,
      title: problem.title,
      version: 1,
      definition: structuredClone(problem.definition),
    });
    em.persist([owner, problem, version]);
    await em.flush();
    return { problem, version };
  }
  test('derivation JSON preserves pinned versions, labels, references and explanation through draft edits/archive', async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const { problem, version } = await fixture(em);
      const expected = definition();
      problem.definition = {
        ...definition(),
        conclusion: 'Q -> Q',
        rules: [{ id: 'reiteration', label: 'Copy' }],
        referenceProof: null,
        explanation: 'Edited draft explanation.',
      };
      problem.archivedAt = new Date();
      await em.flush();
      em.clear();
      assert.deepEqual((await em.findOneOrFail(ProblemVersion, version.id)).definition, expected);
      assert.equal((await em.findOneOrFail(Problem, problem.id)).definition.type, 'derivation');
      await em.nativeUpdate(Problem, problem.id, { archivedAt: null });
      em.clear();
      assert.deepEqual((await em.findOneOrFail(ProblemVersion, version.id)).definition, expected);
    } finally {
      await em.rollback();
    }
  });
  test('derivation drafts retain blank statements and missing references without inventing acceptance', async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const { problem } = await fixture(em);
      const incomplete: DerivationDefinition = {
        ...definition(),
        premises: [{ id: a, formula: '' }],
        conclusion: '',
        rules: [],
        referenceProof: null,
        explanation: null,
      };
      problem.definition = incomplete;
      await em.flush();
      em.clear();
      assert.deepEqual((await em.findOneOrFail(Problem, problem.id)).definition, incomplete);
    } finally {
      await em.rollback();
    }
  });
  for (const operation of ['update', 'delete'] as const)
    test(`derivation published JSON rejects ${operation}`, async () => {
      const em = orm.em.fork();
      await em.begin();
      try {
        const { version } = await fixture(em);
        await assert.rejects(
          operation === 'update'
            ? em.nativeUpdate(ProblemVersion, version.id, {
                definition: { ...definition(), referenceProof: null },
              })
            : em.nativeDelete(ProblemVersion, version.id),
          /Published problem versions are immutable/,
        );
      } finally {
        await em.rollback();
      }
    });
}
