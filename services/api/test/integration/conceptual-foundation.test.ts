import type { ConceptualProblemDefinition } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { StudentWorkError } from '../../src/application/student-work/errors';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');

test('conceptual snapshots project redacted student content and invalid response saves roll back attempts', async () => {
  const db = await import('@logiclab/db');
  const schema = `conceptual_foundation_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url, { schema, snapshotOnMigrate: false });
  try {
    await orm.schema.create();
    const em = orm.em.fork();
    const owner = em.create(db.User, {
      cognitoUserPoolId: schema,
      cognitoSubject: 'owner',
      role: db.UserRole.Instructor,
    });
    const student = em.create(db.User, {
      cognitoUserPoolId: schema,
      cognitoSubject: 'student',
      role: db.UserRole.Student,
    });
    const outsider = em.create(db.User, {
      cognitoUserPoolId: schema,
      cognitoSubject: 'outsider',
      role: db.UserRole.Student,
    });
    const classroom = em.create(db.Classroom, { owner, name: 'Conceptual foundation' });
    const definition: ConceptualProblemDefinition = {
      type: 'true_false',
      definitionVersion: 1,
      question: 'Every contradiction is true.',
      correctAnswer: false,
      explanation: 'Private answer explanation.',
    };
    const problem = em.create(db.Problem, { owner, title: 'Conceptual fixture', definition });
    const version = em.create(db.ProblemVersion, {
      problem,
      title: problem.title,
      version: 1,
      definition: structuredClone(definition),
    });
    const assignment = em.create(db.Assignment, {
      classroom,
      title: 'Staged conceptual work',
      publishedAt: new Date(),
      solutionAccess: db.SolutionAccess.Anytime,
    });
    const item = em.create(db.AssignmentItem, { assignment, problemVersion: version, position: 1 });
    em.persist([
      owner,
      student,
      outsider,
      classroom,
      problem,
      version,
      assignment,
      item,
      em.create(db.Enrollment, { classroom, student }),
    ]);
    await em.flush();
    const problems = await createProblemStore(orm);
    const work = await createStudentWorkStore(orm);
    assert.equal(await problems.findOwned(outsider.id, problem.id), null);
    assert.deepEqual((await problems.findOwned(owner.id, problem.id))?.definition, definition);
    assert.deepEqual((await problems.findVersion(owner.id, problem.id, 1))?.definition, definition);
    const publication = await problems.publish(owner.id, problem.id);
    assert.equal(publication.status, 'published');
    assert.equal(
      await em.count(db.ProblemVersion, { problem: problem.id }),
      2,
      'Conceptual publication now creates an owned immutable snapshot.',
    );
    await assert.rejects(work.read(outsider.id, assignment.id), /not_found/);
    const read = await work.read(student.id, assignment.id);
    assert.deepEqual(read.assignment.items[0], {
      id: item.id,
      position: 1,
      title: problem.title,
      instructions: null,
      content: { type: 'true_false', definitionVersion: 1, question: definition.question },
    });
    assert.deepEqual((await work.solution(student.id, assignment.id, item.id)).solution, {
      type: 'true_false',
      correctAnswer: false,
      explanation: definition.explanation,
    });
    await assert.rejects(
      work.save(student.id, assignment.id, { revision: 0, itemId: item.id, answers: [] }),
      StudentWorkError,
    );
    assert.equal(
      await em.count(db.AssignmentAttempt, { assignment: assignment.id }),
      0,
      'No partial attempt survives a rejected response.',
    );
    await em.nativeUpdate(db.Assignment, assignment.id, {
      assessmentMode: db.AssessmentMode.UngradedPractice,
      feedbackTiming: db.FeedbackTiming.OnCheck,
    });
    await assert.rejects(
      work.check(student.id, assignment.id, { itemId: item.id, answers: [] }),
      StudentWorkError,
    );
    em.clear();
    assert.deepEqual(
      (await em.findOneOrFail(db.ProblemVersion, version.id)).definition,
      definition,
    );
  } finally {
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
});
