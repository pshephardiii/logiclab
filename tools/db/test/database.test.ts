import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createDatabase, User, UserRole, AuthSession, Classroom, Enrollment } from '../src/index.js';

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

test('persists classes, scopes owner queries, and protects classes from owner deletion', async () => {
  const em = orm.em.fork(); await em.begin();
  try {
    const first = em.create(User, { cognitoUserPoolId: 'class-test', cognitoSubject: 'first', role: UserRole.Instructor });
    const second = em.create(User, { cognitoUserPoolId: 'class-test', cognitoSubject: 'second', role: UserRole.Instructor });
    const a = em.create(Classroom, { name: 'Logic', owner: first });
    const b = em.create(Classroom, { name: 'Logic', owner: second });
    em.persist([first, second, a, b]); await em.flush(); em.clear();
    const owned = await em.find(Classroom, { owner: first.id });
    assert.deepEqual(owned.map(row => row.id), [a.id]);
    assert(owned[0]); assert.equal(owned[0].name, 'Logic'); assert(owned[0].createdAt instanceof Date);
    assert.equal(await em.findOne(Classroom, { id: b.id, owner: first.id }), null);
    await assert.rejects(em.nativeDelete(User, first.id), /foreign key|violates/i);
  } finally { await em.rollback(); }
});


test('invitation rotation replaces the hash/expiry and rejects duplicate hashes', async () => {
  const em = orm.em.fork(); await em.begin();
  try {
    const owner = em.create(User, { cognitoUserPoolId: 'invite-test', cognitoSubject: 'owner', role: UserRole.Instructor });
    const first = em.create(Classroom, { name: 'First', owner });
    const second = em.create(Classroom, { name: 'Second', owner });
    em.persist([owner, first, second]); await em.flush();
    const expiry = new Date('2026-10-20T12:00:00Z');
    assert.equal(await em.nativeUpdate(Classroom, { id: first.id, owner: owner.id }, { invitationHash: 'a'.repeat(64), invitationExpiresAt: expiry }), 1);
    assert.equal(await em.nativeUpdate(Classroom, { id: first.id, owner: second.id }, { invitationHash: 'b'.repeat(64) }), 0);
    assert.equal(await em.nativeUpdate(Classroom, { id: first.id, owner: owner.id }, { invitationHash: 'c'.repeat(64), invitationExpiresAt: expiry }), 1);
    em.clear();
    assert.equal(await em.findOne(Classroom, { invitationHash: 'a'.repeat(64) }), null);
    const saved = await em.findOneOrFail(Classroom, first.id);
    assert.equal(saved.invitationHash, 'c'.repeat(64)); assert.equal(saved.invitationExpiresAt?.toISOString(), expiry.toISOString());
    await assert.rejects(em.nativeUpdate(Classroom, second.id, { invitationHash: 'c'.repeat(64) }), /duplicate|unique/i);
  } finally { await em.rollback(); }
});

test('enrollment supports multiple classes, isolates students, and preserves membership after invitation replacement', async () => {
  const em = orm.em.fork();await em.begin();
  try {
    const owner = em.create(User, { cognitoUserPoolId: 'enroll-test', cognitoSubject: 'owner', role: UserRole.Instructor });
    const student = em.create(User, { cognitoUserPoolId: 'enroll-test', cognitoSubject: 'student', role: UserRole.Student });
    const other = em.create(User, { cognitoUserPoolId: 'enroll-test', cognitoSubject: 'other', role: UserRole.Student });
    const anotherOwner = em.create(User, { cognitoUserPoolId: 'enroll-test', cognitoSubject: 'another-owner', role: UserRole.Instructor });
    const first = em.create(Classroom, { name: 'First', owner });const second = em.create(Classroom, { name: 'Second', owner: anotherOwner });
    em.persist([owner, anotherOwner, student, other, first, second]);await em.flush();
    await em.upsert(Enrollment, { classroom: first, student }, { onConflictFields: ['classroom', 'student'], onConflictAction: 'ignore' });
    await em.upsert(Enrollment, { classroom: first, student }, { onConflictFields: ['classroom', 'student'], onConflictAction: 'ignore' });
    await em.upsert(Enrollment, { classroom: second, student }, { onConflictFields: ['classroom', 'student'], onConflictAction: 'ignore' });
    assert.equal(await em.count(Enrollment, { student: student.id }), 2);
    assert.equal(await em.count(Enrollment, { student: other.id }), 0);
    await em.nativeUpdate(Classroom, first.id, { invitationHash: 'e'.repeat(64), invitationExpiresAt: new Date() });
    assert.equal(await em.count(Enrollment, { student: student.id, classroom: first.id }), 1);
    assert.equal(await em.findOne(Enrollment, { student: other.id, classroom: first.id }), null);
    await em.nativeDelete(User, student.id);em.clear();assert.equal(await em.count(Enrollment, { student: student.id }), 0);
  } finally { await em.rollback(); }
});
