import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createProblemStore } from '../../src/persistence/problem/store';
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');

test('library publication summaries distinguish drafts, latest publications and draft changes within owner/page scope', async () => {
  const { createDatabase, User, UserRole } = await import('@logiclab/db');
  const schema = `problem_status_${randomUUID().replaceAll('-', '')}`;
  const orm = await createDatabase(url, { schema, snapshotOnMigrate: false });
  try {
    await orm.schema.create();
    const em = orm.em.fork();
    const users = ['owner', 'other'].map((subject) =>
      em.create(User, {
        cognitoUserPoolId: schema,
        cognitoSubject: subject,
        role: UserRole.Instructor,
      }),
    );
    em.persist(users);
    await em.flush();
    const owner = users[0]!.id,
      other = users[1]!.id;
    const store = await createProblemStore(orm);
    const a = await store.create(owner, {
      title: 'Source',
      definition: { type: 'truth_table', definitionVersion: 1, formula: 'P' },
    });
    const foreign = await store.create(other, {
      title: 'Foreign',
      definition: { type: 'truth_table', definitionVersion: 1, formula: 'Q' },
    });
    assert.equal((await store.list(owner, 20, 0))[0]!.publication, null);
    await store.publish(other, foreign.id);
    await store.publish(owner, a.id);
    const first = (await store.list(owner, 20, 0))[0]!;
    assert.equal(first.id, a.id);
    assert.equal(first.publication?.version, 1);
    assert.equal(first.publication?.hasDraftChanges, false);
    assert.ok(first.publication?.publishedAt);
    await store.update(owner, a.id, {
      definition: { type: 'truth_table', definitionVersion: 1, formula: 'R' },
    });
    assert.equal((await store.list(owner, 20, 0))[0]!.publication?.hasDraftChanges, true);
    await store.publish(owner, a.id);
    assert.equal((await store.list(owner, 20, 0))[0]!.publication?.version, 2);
    assert.equal((await store.list(owner, 20, 0))[0]!.publication?.hasDraftChanges, false);
    assert.equal((await store.list(other, 20, 0))[0]!.id, foreign.id);
    assert.equal((await store.list(other, 20, 0))[0]!.publication?.version, 1);
    await store.setArchived(owner, a.id, true);
    assert.equal((await store.list(owner, 20, 0)).length, 0);
    assert.equal((await store.list(owner, 1, 0, 'archived'))[0]!.publication?.version, 2);
    assert.equal((await store.list(owner, 1, 1, 'all')).length, 0);
  } finally {
    await orm.em.getConnection().execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
});
