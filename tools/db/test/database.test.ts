import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createDatabase, User, UserRole, AuthSession } from '../src/index.js';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Set TEST_DATABASE_URL to a disposable integration-test database.');
const orm = await createDatabase(url, { snapshotOnMigrate: false });
const databaseName = decodeURIComponent(new URL(url).pathname.slice(1));
const snapshotFile = new URL(`../src/migrations/.snapshot-${databaseName}.json`, import.meta.url);

async function snapshotState() {
  try {
    return { content: await readFile(snapshotFile, 'utf8'), modified: (await stat(snapshotFile)).mtimeMs };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}

before(async () => {
  const snapshotBefore = await snapshotState();
  await orm.migrator.up();
  await orm.migrator.up();
  assert.equal((await orm.migrator.getPending()).length, 0);
  assert.deepEqual(await snapshotState(), snapshotBefore, 'Test migrations must not create or rewrite snapshots.');
});
after(async () => { await orm.close(true); });

test('persists and reloads a Cognito-linked entity through a forked EntityManager', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    const user = em.create(User, { cognitoUserPoolId: 'test-pool', cognitoSubject: 'test-subject', role: UserRole.Student });
    em.persist(user);
    await em.flush();
    em.clear();
    const saved = await em.findOneOrFail(User, user.id);
    assert.match(saved.id, /^[0-9a-f-]{36}$/);
    assert.equal(saved.role, UserRole.Student);
    assert(saved.createdAt instanceof Date);
  } finally { await em.rollback(); }
});

test('rejects duplicate identities while permitting the same subject in another pool', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    em.persist(em.create(User, { cognitoUserPoolId: 'pool-one', cognitoSubject: 'same-subject', role: UserRole.Instructor }));
    em.persist(em.create(User, { cognitoUserPoolId: 'pool-two', cognitoSubject: 'same-subject', role: UserRole.Instructor }));
    await em.flush();
    em.persist(em.create(User, { cognitoUserPoolId: 'pool-one', cognitoSubject: 'same-subject', role: UserRole.Instructor }));
    await assert.rejects(em.flush(), /duplicate|unique/i);
  } finally { await em.rollback(); }
});

test('database rejects an unsupported account role', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    await assert.rejects(em.execute("insert into users (cognito_user_pool_id, cognito_subject, role) values ('test-pool', 'test-role', 'admin')"), /invalid input value for enum/i);
  } finally { await em.rollback(); }
});

test('persists a user-linked session and deleting the user cascades to sessions', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    const user = em.create(User, { cognitoUserPoolId: 'session-test', cognitoSubject: 'session-user', role: UserRole.Student });
    const session = em.create(AuthSession, { id: 'a'.repeat(64), user, encryptedTokens: 'encrypted-test-value', accessExpiresAt: new Date(), expiresAt: new Date(Date.now() + 1000) });
    em.persist([user, session]); await em.flush(); em.clear();
    const saved = await em.findOneOrFail(AuthSession, session.id, { populate: ['user'] });
    assert.equal(saved.user.cognitoSubject, 'session-user');
    await em.nativeDelete(User, user.id); em.clear();
    assert.equal(await em.findOne(AuthSession, session.id), null);
  } finally { await em.rollback(); }
});

test('normalized recovery email is unique within a pool, while legacy users may omit it', async () => {
  const em = orm.em.fork(); await em.begin();
  try {
    em.persist(em.create(User, { cognitoUserPoolId: 'email-pool', cognitoSubject: 'one', role: UserRole.Student, email: 'person@example.com' }));
    em.persist(em.create(User, { cognitoUserPoolId: 'other-pool', cognitoSubject: 'two', role: UserRole.Student, email: 'person@example.com' }));
    await em.flush();
    em.persist(em.create(User, { cognitoUserPoolId: 'email-pool', cognitoSubject: 'three', role: UserRole.Student, email: 'person@example.com' }));
    await assert.rejects(em.flush(), /duplicate|unique/i);
  } finally { await em.rollback(); }
});
