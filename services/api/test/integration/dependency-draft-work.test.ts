import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  dependencyDefinitionFixture,
  derivationDefinitionFixture,
  treeDefinitionFixture,
} from '../derivation-fixture';
import { StudentWorkError } from '../../src/application/student-work/errors';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import { buildApp } from '../../src/app';
import {
  savedStudentAssignmentResponseSchema,
  savedStudentAttemptResponseSchema,
  savedStudentCheckResponseSchema,
  savedStudentSolutionResponseSchema,
  savedDerivationAnswerSchema,
  savedStudentAnswersSchema,
} from '@logiclab/contracts/saved-student-work';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const origin = 'http://localhost:5173';
const variants = [dependencyDefinitionFixture, treeDefinitionFixture].flatMap((definitionFixture) =>
  (['normal', 'demo'] as const).map((mode) => ({ definitionFixture, mode })),
);
for (const { definitionFixture, mode } of variants) {
  test(`${mode} ${definitionFixture().format} draft HTTP work preserves revision locks, privacy, format matching and independent checks/solutions`, async () => {
    const db = await import('@logiclab/db');
    const schema = `dependency_work_${randomUUID().replaceAll('-', '')}`;
    const orm = await db.createDatabase(url, { schema, snapshotOnMigrate: false });
    let app: ReturnType<typeof buildApp> | undefined;
    try {
      await orm.schema.create();
      const em = orm.em.fork();
      const normalOwner = em.create(db.User, {
        cognitoUserPoolId: schema,
        cognitoSubject: 'owner',
        role: db.UserRole.Instructor,
      });
      const normalStudent = em.create(db.User, {
        cognitoUserPoolId: schema,
        cognitoSubject: 'student',
        role: db.UserRole.Student,
      });
      const outsider = em.create(db.User, {
        cognitoUserPoolId: schema,
        cognitoSubject: 'outsider',
        role: db.UserRole.Student,
      });
      const normalClass = em.create(db.Classroom, {
        owner: normalOwner,
        name: 'Dependency test class',
      });
      em.persist([
        normalOwner,
        normalStudent,
        outsider,
        normalClass,
        em.create(db.Enrollment, { classroom: normalClass, student: normalStudent }),
      ]);
      await em.flush();
      let active = { id: normalStudent.id, role: 'student' as const };
      const demo = await createDemoRuntime(
        orm,
        readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: origin })!,
      );
      const store = await createStudentWorkStore(orm);
      app = buildApp({
        studentWork: {
          config: { APP_ORIGIN: origin, secureCookies: false },
          service: { authenticate: async () => active },
          studentWork: store,
        },
        demo,
      });
      let address = 1;
      const request = (
        method: 'GET' | 'PATCH' | 'POST',
        path: string,
        cookie: string,
        payload?: object,
        requestOrigin = origin,
      ) =>
        app!.inject({
          method,
          url: path,
          payload,
          headers: { cookie, origin: requestOrigin },
          remoteAddress: `127.0.0.${address++}`,
        });
      let owner = normalOwner,
        student = normalStudent,
        classroom = normalClass;
      let cookie = 'logiclab_session=fake',
        foreignCookie = cookie;
      if (mode === 'demo') {
        const start = await request('POST', '/api/demo/start', '', { role: 'student' });
        assert.equal(start.statusCode, 200, start.body);
        cookie = String(start.headers['set-cookie']).split(';')[0]!;
        const other = await request('POST', '/api/demo/start', '', { role: 'student' });
        foreignCookie = String(other.headers['set-cookie']).split(';')[0]!;
        student = await em.findOneOrFail(db.User, start.json().user.id);
        owner = await em.findOneOrFail(db.User, {
          demoWorkspace: student.demoWorkspace!.id,
          role: db.UserRole.Instructor,
        });
        classroom = await em.findOneOrFail(db.Classroom, {
          owner,
          name: 'Demo: Introduction to Logic',
        });
      }
      const problems = await createProblemStore(orm);
      const definition = definitionFixture();
      const draft = await problems.create(owner.id, { title: 'Pinned dependency', definition });
      const published = await problems.publish(owner.id, draft.id);
      if (published.status !== 'published') assert.fail('Expected fixture publication');
      // Direct persistence fixture isolates draft HTTP behavior from assignment authoring.
      const assignment = em.create(db.Assignment, {
        classroom,
        title: 'Staged dependency practice',
        assessmentMode: db.AssessmentMode.UngradedPractice,
        feedbackTiming: db.FeedbackTiming.Immediate,
        solutionAccess: db.SolutionAccess.Never,
      });
      const version = em.getReference(db.ProblemVersion, published.version.id);
      const first = em.create(db.AssignmentItem, {
        assignment,
        problemVersion: version,
        position: 1,
        maxPoints: 10,
      });
      const second = em.create(db.AssignmentItem, {
        assignment,
        problemVersion: version,
        position: 2,
        maxPoints: 10,
      });
      em.persist([assignment, first, second]);
      await em.flush();
      assignment.publishedAt = new Date();
      await em.flush();
      const prefix = `/api/${mode === 'demo' ? 'demo/resources/' : ''}student/assignments/${assignment.id}`;
      const valid = savedDerivationAnswerSchema.parse({
        type: 'derivation',
        proof: definition.referenceProof,
      });
      const incomplete = structuredClone(valid);
      const firstNode =
        'steps' in incomplete.proof ? incomplete.proof.steps[0]! : incomplete.proof.nodes[0]!;
      firstNode.formula = 'P &';
      const read = await request('GET', prefix, cookie);
      assert.equal(read.statusCode, 200, read.body);
      savedStudentAssignmentResponseSchema.parse(read.json());
      assert(!read.body.includes('referenceProof'));
      assert(!read.body.includes('Assuming P permits'));
      const counts = await em.count(db.AssignmentAttempt, { assignment: assignment.id });
      const checked = await request('POST', `${prefix}/check`, cookie, {
        itemId: first.id,
        answers: valid,
      });
      assert.equal(checked.statusCode, 200, checked.body);
      assert.equal(checked.headers['cache-control'], 'no-store');
      const parsedFeedback = savedStudentCheckResponseSchema.parse(checked.json()).feedback;
      assert.equal('type' in parsedFeedback ? parsedFeedback.type : null, 'derivation');
      assert.equal(checked.json().feedback.report.status, 'accepted');
      assert.equal(
        await em.fork().count(db.AssignmentAttempt, { assignment: assignment.id }),
        counts,
      );
      for (const answers of [
        { type: 'derivation', proof: derivationDefinitionFixture().referenceProof },
        { ...valid, report: checked.json().feedback.report },
      ]) {
        const bad = await request('PATCH', `${prefix}/attempt`, cookie, {
          revision: 0,
          itemId: first.id,
          answers,
        });
        assert.equal(bad.statusCode, 400, bad.body);
      }
      assert.equal(
        await em.fork().count(db.AssignmentAttempt, { assignment: assignment.id }),
        counts,
      );
      const saved = await request('PATCH', `${prefix}/attempt`, cookie, {
        revision: 0,
        itemId: first.id,
        answers: incomplete,
      });
      assert.equal(saved.statusCode, 200, saved.body);
      const baseline = savedStudentAttemptResponseSchema.parse(saved.json()).attempt;
      assert.deepEqual(baseline.answers[first.id], incomplete);
      assert.equal(baseline.revision, 1);
      const stale = await request('PATCH', `${prefix}/attempt`, cookie, {
        revision: 0,
        itemId: second.id,
        answers: valid,
      });
      assert.equal(stale.statusCode, 409, stale.body);
      const twice = await request('PATCH', `${prefix}/attempt`, cookie, {
        revision: 1,
        itemId: second.id,
        answers: valid,
      });
      assert.equal(twice.statusCode, 200, twice.body);
      assert.deepEqual(twice.json().attempt.answers[first.id], incomplete);
      assert.deepEqual((await request('GET', prefix, cookie)).json().attempt, twice.json().attempt);
      const race = await Promise.all([
        request('PATCH', `${prefix}/attempt`, cookie, {
          revision: 2,
          itemId: first.id,
          answers: valid,
        }),
        request('PATCH', `${prefix}/attempt`, cookie, {
          revision: 2,
          itemId: second.id,
          answers: incomplete,
        }),
      ]);
      assert.deepEqual(race.map((response) => response.statusCode).sort(), [200, 409]);
      const afterRace = (await request('GET', prefix, cookie)).json().attempt;
      assert.equal(afterRace.revision, 3);
      await assert.rejects(
        orm.em.fork().transactional(async (manager) => {
          const transactionalStore = await createStudentWorkStore(orm, manager);
          await transactionalStore.save(
            student.id,
            assignment.id,
            savedStudentAnswersSchema.parse({
              revision: 3,
              itemId: first.id,
              answers: valid,
            }),
          );
          throw new Error('ROLLBACK_PROOF_SAVE');
        }),
        /ROLLBACK_PROOF_SAVE/,
      );
      assert.deepEqual((await request('GET', prefix, cookie)).json().attempt, afterRace);
      assert.equal(
        (
          await request('POST', `${prefix}/check`, cookie, {
            itemId: first.id,
            answers: { type: 'derivation', proof: derivationDefinitionFixture().referenceProof },
          })
        ).statusCode,
        400,
      );
      assert.equal(
        (await request('GET', `${prefix}/items/${first.id}/solution`, cookie)).statusCode,
        403,
      );
      await orm.em.fork().nativeUpdate(db.Assignment, assignment.id, {
        solutionAccess: db.SolutionAccess.Anytime,
      });
      const solution = await request('GET', `${prefix}/items/${first.id}/solution`, cookie);
      assert.equal(solution.statusCode, 200, solution.body);
      const parsedSolution = savedStudentSolutionResponseSchema.parse(solution.json()).solution;
      assert.equal('type' in parsedSolution ? parsedSolution.type : null, 'derivation');
      assert.deepEqual(solution.json().solution.referenceProof, definition.referenceProof);
      await problems.update(owner.id, draft.id, {
        definition: {
          ...definition,
          conclusion: 'Q',
          referenceProof: null,
          explanation: 'CHANGED_PRIVATE_EXPLANATION',
        },
      });
      assert.deepEqual(
        (await request('GET', `${prefix}/items/${first.id}/solution`, cookie)).json(),
        solution.json(),
      );
      assert(!(await request('GET', prefix, cookie)).body.includes('CHANGED_PRIVATE_EXPLANATION'));
      assert.equal(
        (
          await request(
            'PATCH',
            `${prefix}/attempt`,
            cookie,
            { revision: 2, itemId: first.id, answers: valid },
            'http://untrusted.test',
          )
        ).statusCode,
        403,
      );
      if (mode === 'normal') active = { id: outsider.id, role: 'student' };
      const foreign = await request('GET', prefix, foreignCookie);
      assert.equal(foreign.statusCode, 404, foreign.body);
      if (mode === 'normal') active = { id: student.id, role: 'student' };
      await orm.em.fork().nativeUpdate(db.Assignment, assignment.id, {
        assessmentMode: db.AssessmentMode.Graded,
        feedbackTiming: db.FeedbackTiming.OnSubmission,
      });
      assert.equal(
        (await request('POST', `${prefix}/check`, cookie, { itemId: first.id, answers: valid }))
          .statusCode,
        403,
      );
      const submitted = await store.submit(student.id, assignment.id, 3);
      assert(submitted.submittedAt);
      assert.equal(submitted.result?.gradingVersion, 'proof_mixed_v1');
      assert.equal(submitted.revision, 4);
      assert.deepEqual(await store.submit(student.id, assignment.id, 0), submitted);
    } finally {
      await app?.close();
      await orm.em.execute(`drop schema if exists "${schema}" cascade`);
      await orm.close(true);
    }
  });
}
