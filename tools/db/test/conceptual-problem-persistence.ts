import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  Problem,
  ProblemVersion,
  User,
  UserRole,
  type ConceptualProblemDefinition,
  type createDatabase,
} from '../src/index.ts';

const optionA = '11111111-1111-4111-8111-111111111111';
const optionB = '22222222-2222-4222-8222-222222222222';
const definitions: ConceptualProblemDefinition[] = [
  {
    type: 'true_false',
    definitionVersion: 1,
    question: 'Every contradiction is true.',
    correctAnswer: false,
    explanation: 'A contradiction is false under every interpretation.',
  },
  {
    type: 'multiple_choice',
    definitionVersion: 1,
    question: 'Which is always false?',
    options: [
      { id: optionA, text: 'Contradiction' },
      { id: optionB, text: 'Tautology' },
    ],
    correctOptionId: optionA,
    explanation: 'A contradiction is always false.',
  },
];

/** JSONB definitions need no schema change; published question/key snapshots stay immutable. */
export function registerConceptualProblemPersistenceTests(
  orm: Awaited<ReturnType<typeof createDatabase>>,
) {
  async function fixture(em: typeof orm.em, definition: ConceptualProblemDefinition) {
    const owner = em.create(User, {
      cognitoUserPoolId: 'conceptual-persistence',
      cognitoSubject: randomUUID(),
      role: UserRole.Instructor,
    });
    const problem = em.create(Problem, {
      owner,
      title: 'Conceptual draft',
      definition: structuredClone(definition),
    });
    const version = em.create(ProblemVersion, {
      problem,
      title: problem.title,
      version: 1,
      definition: structuredClone(definition),
    });
    em.persist([owner, problem, version]);
    await em.flush();
    return { problem, version };
  }
  for (const definition of definitions) {
    test(`${definition.type} draft edits and archive preserve published question, key and explanation`, async () => {
      const em = orm.em.fork();
      await em.begin();
      try {
        const { problem, version } = await fixture(em, definition);
        const edited: ConceptualProblemDefinition =
          definition.type === 'true_false'
            ? { ...definition, question: 'New question', correctAnswer: true, explanation: null }
            : {
                ...definition,
                options: [
                  { id: optionB, text: 'Edited second choice' },
                  { id: optionA, text: 'Edited first choice' },
                ],
                correctOptionId: optionB,
                explanation: 'Changed key explanation',
              };
        problem.definition = edited;
        problem.archivedAt = new Date();
        await em.flush();
        em.clear();
        assert.deepEqual((await em.findOneOrFail(Problem, problem.id)).definition, edited);
        assert.deepEqual(
          (await em.findOneOrFail(ProblemVersion, version.id)).definition,
          definition,
        );
        await em.nativeUpdate(Problem, problem.id, { archivedAt: null });
        em.clear();
        assert.deepEqual(
          (await em.findOneOrFail(ProblemVersion, version.id)).definition,
          definition,
        );
      } finally {
        await em.rollback();
      }
    });
    for (const operation of ['update', 'delete'] as const) {
      test(`${definition.type} published key rejects ${operation}`, async () => {
        const em = orm.em.fork();
        await em.begin();
        try {
          const { version } = await fixture(em, definition);
          await assert.rejects(
            operation === 'update'
              ? em.nativeUpdate(ProblemVersion, version.id, {
                  definition: { ...definition, explanation: 'Rewritten answer key' },
                })
              : em.nativeDelete(ProblemVersion, version.id),
            /Published problem versions are immutable/,
          );
        } finally {
          await em.rollback();
        }
      });
    }
  }
}
