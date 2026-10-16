import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import {
  createDatabase,
  User,
  UserRole,
  AuthSession,
  Classroom,
  Enrollment,
  Problem,
  ProblemVersion,
  Assignment,
  AssignmentItem,
  AssessmentMode,
  FeedbackTiming,
} from '../src/index.js';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Set TEST_DATABASE_URL to a disposable integration-test database.');
const orm = await createDatabase(url, { snapshotOnMigrate: false });
const databaseName = decodeURIComponent(new URL(url).pathname.slice(1));
const snapshotFile = new URL(`../src/migrations/.snapshot-${databaseName}.json`, import.meta.url);

async function snapshotState() {
  try {
    return {
      content: await readFile(snapshotFile, 'utf8'),
      modified: (await stat(snapshotFile)).mtimeMs,
    };
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
  assert.deepEqual(
    await snapshotState(),
    snapshotBefore,
    'Test migrations must not create or rewrite snapshots.',
  );
});
after(async () => {
  await orm.close(true);
});

test('persists and reloads a Cognito-linked entity through a forked EntityManager', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    const user = em.create(User, {
      cognitoUserPoolId: 'test-pool',
      cognitoSubject: 'test-subject',
      role: UserRole.Student,
    });
    em.persist(user);
    await em.flush();
    em.clear();
    const saved = await em.findOneOrFail(User, user.id);
    assert.match(saved.id, /^[0-9a-f-]{36}$/);
    assert.equal(saved.role, UserRole.Student);
    assert(saved.createdAt instanceof Date);
  } finally {
    await em.rollback();
  }
});

test('rejects duplicate identities while permitting the same subject in another pool', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    em.persist(
      em.create(User, {
        cognitoUserPoolId: 'pool-one',
        cognitoSubject: 'same-subject',
        role: UserRole.Instructor,
      }),
    );
    em.persist(
      em.create(User, {
        cognitoUserPoolId: 'pool-two',
        cognitoSubject: 'same-subject',
        role: UserRole.Instructor,
      }),
    );
    await em.flush();
    em.persist(
      em.create(User, {
        cognitoUserPoolId: 'pool-one',
        cognitoSubject: 'same-subject',
        role: UserRole.Instructor,
      }),
    );
    await assert.rejects(em.flush(), /duplicate|unique/i);
  } finally {
    await em.rollback();
  }
});

test('database rejects an unsupported account role', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    await assert.rejects(
      em.execute(
        "insert into users (cognito_user_pool_id, cognito_subject, role) values ('test-pool', 'test-role', 'admin')",
      ),
      /invalid input value for enum/i,
    );
  } finally {
    await em.rollback();
  }
});

test('persists a user-linked session and deleting the user cascades to sessions', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    const user = em.create(User, {
      cognitoUserPoolId: 'session-test',
      cognitoSubject: 'session-user',
      role: UserRole.Student,
    });
    const session = em.create(AuthSession, {
      id: 'a'.repeat(64),
      user,
      encryptedTokens: 'encrypted-test-value',
      accessExpiresAt: new Date(),
      expiresAt: new Date(Date.now() + 1000),
    });
    em.persist([user, session]);
    await em.flush();
    em.clear();
    const saved = await em.findOneOrFail(AuthSession, session.id, { populate: ['user'] });
    assert.equal(saved.user.cognitoSubject, 'session-user');
    await em.nativeDelete(User, user.id);
    em.clear();
    assert.equal(await em.findOne(AuthSession, session.id), null);
  } finally {
    await em.rollback();
  }
});

test('normalized recovery email is unique within a pool, while legacy users may omit it', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    em.persist(
      em.create(User, {
        cognitoUserPoolId: 'email-pool',
        cognitoSubject: 'one',
        role: UserRole.Student,
        email: 'person@example.com',
      }),
    );
    em.persist(
      em.create(User, {
        cognitoUserPoolId: 'other-pool',
        cognitoSubject: 'two',
        role: UserRole.Student,
        email: 'person@example.com',
      }),
    );
    await em.flush();
    em.persist(
      em.create(User, {
        cognitoUserPoolId: 'email-pool',
        cognitoSubject: 'three',
        role: UserRole.Student,
        email: 'person@example.com',
      }),
    );
    await assert.rejects(em.flush(), /duplicate|unique/i);
  } finally {
    await em.rollback();
  }
});

test('persists classes, scopes owner queries, and protects classes from owner deletion', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    const first = em.create(User, {
      cognitoUserPoolId: 'class-test',
      cognitoSubject: 'first',
      role: UserRole.Instructor,
    });
    const second = em.create(User, {
      cognitoUserPoolId: 'class-test',
      cognitoSubject: 'second',
      role: UserRole.Instructor,
    });
    const a = em.create(Classroom, { name: 'Logic', owner: first });
    const b = em.create(Classroom, { name: 'Logic', owner: second });
    em.persist([first, second, a, b]);
    await em.flush();
    em.clear();
    const owned = await em.find(Classroom, { owner: first.id });
    assert.deepEqual(
      owned.map((row) => row.id),
      [a.id],
    );
    assert(owned[0]);
    assert.equal(owned[0].name, 'Logic');
    assert(owned[0].createdAt instanceof Date);
    assert.equal(await em.findOne(Classroom, { id: b.id, owner: first.id }), null);
    await assert.rejects(em.nativeDelete(User, first.id), /foreign key|violates/i);
  } finally {
    await em.rollback();
  }
});

test('invitation rotation replaces the hash/expiry and rejects duplicate hashes', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    const owner = em.create(User, {
      cognitoUserPoolId: 'invite-test',
      cognitoSubject: 'owner',
      role: UserRole.Instructor,
    });
    const first = em.create(Classroom, { name: 'First', owner });
    const second = em.create(Classroom, { name: 'Second', owner });
    em.persist([owner, first, second]);
    await em.flush();
    const expiry = new Date('2026-10-20T12:00:00Z');
    assert.equal(
      await em.nativeUpdate(
        Classroom,
        { id: first.id, owner: owner.id },
        { invitationHash: 'a'.repeat(64), invitationExpiresAt: expiry },
      ),
      1,
    );
    assert.equal(
      await em.nativeUpdate(
        Classroom,
        { id: first.id, owner: second.id },
        { invitationHash: 'b'.repeat(64) },
      ),
      0,
    );
    assert.equal(
      await em.nativeUpdate(
        Classroom,
        { id: first.id, owner: owner.id },
        { invitationHash: 'c'.repeat(64), invitationExpiresAt: expiry },
      ),
      1,
    );
    em.clear();
    assert.equal(await em.findOne(Classroom, { invitationHash: 'a'.repeat(64) }), null);
    const saved = await em.findOneOrFail(Classroom, first.id);
    assert.equal(saved.invitationHash, 'c'.repeat(64));
    assert.equal(saved.invitationExpiresAt?.toISOString(), expiry.toISOString());
    await assert.rejects(
      em.nativeUpdate(Classroom, second.id, { invitationHash: 'c'.repeat(64) }),
      /duplicate|unique/i,
    );
  } finally {
    await em.rollback();
  }
});

test('enrollment supports multiple classes, isolates students, and preserves membership after invitation replacement', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    const owner = em.create(User, {
      cognitoUserPoolId: 'enroll-test',
      cognitoSubject: 'owner',
      role: UserRole.Instructor,
    });
    const student = em.create(User, {
      cognitoUserPoolId: 'enroll-test',
      cognitoSubject: 'student',
      role: UserRole.Student,
    });
    const other = em.create(User, {
      cognitoUserPoolId: 'enroll-test',
      cognitoSubject: 'other',
      role: UserRole.Student,
    });
    const anotherOwner = em.create(User, {
      cognitoUserPoolId: 'enroll-test',
      cognitoSubject: 'another-owner',
      role: UserRole.Instructor,
    });
    const first = em.create(Classroom, { name: 'First', owner });
    const second = em.create(Classroom, { name: 'Second', owner: anotherOwner });
    em.persist([owner, anotherOwner, student, other, first, second]);
    await em.flush();
    await em.upsert(
      Enrollment,
      { classroom: first, student },
      { onConflictFields: ['classroom', 'student'], onConflictAction: 'ignore' },
    );
    await em.upsert(
      Enrollment,
      { classroom: first, student },
      { onConflictFields: ['classroom', 'student'], onConflictAction: 'ignore' },
    );
    await em.upsert(
      Enrollment,
      { classroom: second, student },
      { onConflictFields: ['classroom', 'student'], onConflictAction: 'ignore' },
    );
    assert.equal(await em.count(Enrollment, { student: student.id }), 2);
    assert.equal(await em.count(Enrollment, { student: other.id }), 0);
    await em.nativeUpdate(Classroom, first.id, {
      invitationHash: 'e'.repeat(64),
      invitationExpiresAt: new Date(),
    });
    assert.equal(await em.count(Enrollment, { student: student.id, classroom: first.id }), 1);
    assert.equal(await em.findOne(Enrollment, { student: other.id, classroom: first.id }), null);
    await em.nativeDelete(User, student.id);
    em.clear();
    assert.equal(await em.count(Enrollment, { student: student.id }), 0);
  } finally {
    await em.rollback();
  }
});

async function problemFixture(em: typeof orm.em) {
  const owner = em.create(User, {
    cognitoUserPoolId: 'problem-library-test',
    cognitoSubject: randomUUID(),
    role: UserRole.Instructor,
  });
  const problem = em.create(Problem, {
    owner,
    title: 'Conjunction',
    instructions: 'Complete the table.',
    definition: { type: 'truth_table', definitionVersion: 1, formula: 'P & Q' },
  });
  const published = em.create(ProblemVersion, {
    problem,
    version: 1,
    title: problem.title,
    instructions: problem.instructions,
    definition: structuredClone(problem.definition),
  });
  em.persist([owner, problem, published]);
  await em.flush();
  return { owner, problem, published };
}

test('draft editing and archive/restore preserve immutable publication history', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    const { problem, published } = await problemFixture(em);
    const problemId = problem.id,
      versionId = published.id;
    problem.title = 'Revised conjunction';
    problem.definition = { type: 'truth_table', definitionVersion: 1, formula: 'Q & R' };
    problem.archivedAt = new Date();
    await em.flush();
    em.clear();
    const saved = await em.findOneOrFail(Problem, problemId);
    const snapshot = await em.findOneOrFail(ProblemVersion, versionId);
    assert.equal(saved.title, 'Revised conjunction');
    assert(saved.archivedAt instanceof Date);
    assert.equal(snapshot.title, 'Conjunction');
    assert.equal(snapshot.definition.formula, 'P & Q');
    assert(snapshot.publishedAt instanceof Date);
    saved.archivedAt = undefined;
    await em.flush();
    em.clear();
    assert.equal((await em.findOneOrFail(Problem, problemId)).archivedAt, null);
    assert.equal(await em.count(ProblemVersion, { problem: problemId }), 1);
  } finally {
    await em.rollback();
  }
});

for (const operation of ['update', 'delete'] as const) {
  test(`database rejects published-version ${operation}`, async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const { published } = await problemFixture(em);
      await assert.rejects(
        operation === 'update'
          ? em.nativeUpdate(ProblemVersion, published.id, { title: 'Changed snapshot' })
          : em.nativeDelete(ProblemVersion, published.id),
        /Published problem versions are immutable/,
      );
    } finally {
      await em.rollback();
    }
  });
}

for (const version of [0, 1]) {
  test(`database rejects ${version === 0 ? 'non-positive' : 'duplicate'} publication versions`, async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const { problem } = await problemFixture(em);
      em.persist(
        em.create(ProblemVersion, {
          problem,
          version,
          title: 'Another version',
          definition: problem.definition,
        }),
      );
      await assert.rejects(
        em.flush(),
        version === 0
          ? /problem_versions_positive_version/
          : /problem_versions_problem_version_unique/,
      );
    } finally {
      await em.rollback();
    }
  });
}

test('published history prevents deleting its parent problem', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    const { problem } = await problemFixture(em);
    await assert.rejects(em.nativeDelete(Problem, problem.id), /problem_versions_problem_id_fkey/);
  } finally {
    await em.rollback();
  }
});

test('migrated schema retains the immutable-version trigger without pending changes', async () => {
  assert.equal((await orm.schema.getUpdateSchemaSQL({ wrap: false })).trim(), '');
});

async function assignmentFixture(em: typeof orm.em) {
  const { owner, problem, published } = await problemFixture(em);
  const classroom = em.create(Classroom, { owner, name: 'Assignment class' });
  const assignment = em.create(Assignment, { classroom, title: 'First assignment' });
  em.persist([classroom, assignment]);
  await em.flush();
  return { classroom, assignment, problem, published };
}

test('assignment SQL defaults keep assessment, feedback, and solutions independent', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    const { classroom } = await assignmentFixture(em);
    const [row] = await em
      .getConnection()
      .execute<{ id: string }[]>(
        'insert into assignments (classroom_id, title) values (?, ?) returning id',
        [classroom.id, 'SQL defaults'],
        'all',
        em.getTransactionContext(),
      );
    const saved = await em.findOneOrFail(Assignment, row!.id);
    assert.equal(saved.assessmentMode, AssessmentMode.Graded);
    assert.equal(saved.feedbackTiming, FeedbackTiming.OnSubmission);
    assert.equal(saved.allowSolutions, false);
    assert.equal(saved.publishedAt ?? null, null);
    assert.equal(saved.archivedAt ?? null, null);
    assert(saved.createdAt instanceof Date);
    assert(saved.updatedAt instanceof Date);
    saved.allowSolutions = true;
    await em.flush();
    em.clear();
    const reloaded = await em.findOneOrFail(Assignment, saved.id);
    assert.equal(reloaded.allowSolutions, true);
    assert.equal(reloaded.assessmentMode, AssessmentMode.Graded);
    assert.equal(reloaded.feedbackTiming, FeedbackTiming.OnSubmission);
  } finally {
    await em.rollback();
  }
});

test('ordered assignment occurrences retain pinned content after library edits and archiving', async () => {
  const em = orm.em.fork();
  await em.begin();
  try {
    const { assignment, problem, published } = await assignmentFixture(em);
    const first = em.create(AssignmentItem, { assignment, problemVersion: published, position: 1 });
    const second = em.create(AssignmentItem, {
      assignment,
      problemVersion: published,
      position: 2,
    });
    em.persist([second, first]);
    await em.flush();
    assert.notEqual(first.id, second.id);
    problem.title = 'Changed draft';
    problem.definition = { ...problem.definition, formula: 'Q' };
    problem.archivedAt = new Date();
    assignment.publishedAt = new Date();
    assignment.archivedAt = new Date();
    await em.flush();
    em.clear();
    const items = await em.find(
      AssignmentItem,
      { assignment: assignment.id },
      { orderBy: { position: 'ASC' }, populate: ['problemVersion', 'assignment.classroom.owner'] },
    );
    assert.deepEqual(
      items.map((item) => item.position),
      [1, 2],
    );
    assert.equal(items[0]!.problemVersion.title, 'Conjunction');
    assert.equal(items[1]!.problemVersion.definition.formula, 'P & Q');
    assert.equal(items[0]!.assignment.classroom.owner.role, UserRole.Instructor);
    assert(items[0]!.assignment.publishedAt instanceof Date);
    assert(items[0]!.assignment.archivedAt instanceof Date);
  } finally {
    await em.rollback();
  }
});

for (const invalid of ['duplicate', 'zero', 'negative'] as const) {
  test(`assignment items reject ${invalid} positions`, async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const { assignment, published } = await assignmentFixture(em);
      em.persist(em.create(AssignmentItem, { assignment, problemVersion: published, position: 1 }));
      await em.flush();
      em.persist(
        em.create(AssignmentItem, {
          assignment,
          problemVersion: published,
          position: invalid === 'duplicate' ? 1 : invalid === 'zero' ? 0 : -1,
        }),
      );
      await assert.rejects(
        em.flush(),
        invalid === 'duplicate'
          ? /assignment_items_assignment_position_unique/
          : /assignment_items_positive_position/,
      );
    } finally {
      await em.rollback();
    }
  });
}

for (const field of ['assessment_mode', 'feedback_timing'] as const) {
  test(`unsupported assignment ${field} is rejected by PostgreSQL`, async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const { assignment } = await assignmentFixture(em);
      await assert.rejects(
        em
          .getConnection()
          .execute(
            `update assignments set ${field} = ? where id = ?`,
            ['unsupported', assignment.id],
            'run',
            em.getTransactionContext(),
          ),
        field === 'assessment_mode'
          ? /assignments_assessment_mode_check/
          : /assignments_feedback_timing_check/,
      );
    } finally {
      await em.rollback();
    }
  });
}

for (const target of ['classroom', 'assignment', 'version'] as const) {
  test(`assignment references prevent deleting ${target} history`, async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const { classroom, assignment, published } = await assignmentFixture(em);
      em.persist(em.create(AssignmentItem, { assignment, problemVersion: published, position: 1 }));
      await em.flush();
      if (target === 'classroom')
        await assert.rejects(
          em.nativeDelete(Classroom, classroom.id),
          /assignments_classroom_id_fkey/,
        );
      if (target === 'assignment')
        await assert.rejects(
          em.nativeDelete(Assignment, assignment.id),
          /assignment_items_assignment_id_fkey/,
        );
      // Immutable version protection remains active even when referenced by assignment items.
      if (target === 'version')
        await assert.rejects(em.nativeDelete(ProblemVersion, published.id), /immutable/);
    } finally {
      await em.rollback();
    }
  });
}
