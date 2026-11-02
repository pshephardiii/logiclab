import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  savedStudentAssignmentResponseSchema,
  savedStudentAttemptResponseSchema,
  savedStudentCheckResponseSchema,
  savedStudentSolutionResponseSchema,
} from '@logiclab/contracts/saved-student-work';
import { buildApp } from '../../src/app';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { assignmentResponseSchema } from '@logiclab/contracts';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import type { ResourceUser } from '../../src/routes/resource-context';
import { derivationDefinitionFixture } from '../derivation-fixture';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const origin = 'http://localhost:5173';

for (const mode of ['normal', 'demo'] as const) {
  test(`${mode} student HTTP proof practice preserves draft privacy, transient checks, pinned references and access guards`, async () => {
    const db = await import('@logiclab/db');
    const schema = `proof_http_${randomUUID().replaceAll('-', '')}`;
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
      const normalClass = em.create(db.Classroom, { owner: normalOwner, name: 'HTTP proof class' });
      em.persist([
        normalOwner,
        normalStudent,
        outsider,
        normalClass,
        em.create(db.Enrollment, { classroom: normalClass, student: normalStudent }),
      ]);
      await em.flush();
      let active: ResourceUser = { id: normalStudent.id, role: 'student' };
      const demo = await createDemoRuntime(
        orm,
        readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: origin })!,
      );
      app = buildApp({
        studentWork: {
          config: { APP_ORIGIN: origin, secureCookies: false },
          service: { authenticate: async () => active },
          studentWork: await createStudentWorkStore(orm),
        },
        assignment: {
          config: { APP_ORIGIN: origin, secureCookies: false },
          service: { authenticate: async () => active },
          assignments: await createAssignmentStore(orm),
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
          headers: { origin: requestOrigin, cookie },
          remoteAddress: `127.0.0.${address++}`,
        });
      function cookieFrom(response: { headers: Record<string, unknown> }) {
        const values = response.headers['set-cookie'];
        const value = Array.isArray(values) ? values[0] : values;
        assert.equal(typeof value, 'string');
        return (value as string).split(';')[0]!;
      }
      let cookie = `logiclab_session=${'a'.repeat(43)}`;
      let otherCookie = cookie;
      let owner = normalOwner;
      let student = normalStudent;
      let classroom = normalClass;
      if (mode === 'demo') {
        const start = await request('POST', '/api/demo/start', '', { role: 'student' });
        assert.equal(start.statusCode, 200, start.body);
        cookie = cookieFrom(start);
        const other = await request('POST', '/api/demo/start', '', { role: 'student' });
        assert.equal(other.statusCode, 200, other.body);
        otherCookie = cookieFrom(other);
        student = await em.findOneOrFail(db.User, start.json().user.id);
        owner = await em.findOneOrFail(db.User, {
          demoWorkspace: student.demoWorkspace!.id,
          role: db.UserRole.Instructor,
        });
        classroom = await em.findOneOrFail(db.Classroom, {
          owner: owner.id,
          name: 'Demo: Introduction to Logic',
        });
      }
      const problems = await createProblemStore(orm);
      const definition = derivationDefinitionFixture();
      const problem = await problems.create(owner.id, { title: 'Pinned HTTP proof', definition });
      const publication = await problems.publish(owner.id, problem.id);
      if (publication.status !== 'published') assert.fail('Expected accepted fixture publication');
      const resourcePrefix = `/api/${mode === 'demo' ? 'demo/resources' : ''}`.replace(/\/$/, '');
      if (mode === 'demo') {
        const switched = await request('POST', '/api/demo/role', cookie, { role: 'instructor' });
        assert.equal(switched.statusCode, 200, switched.body);
        cookie = cookieFrom(switched);
      } else {
        active = { id: owner.id, role: 'instructor' };
        const manager = orm.em.fork();
        manager.persist(
          manager.create(db.ClassEntitlement, {
            classroom: manager.getReference(db.Classroom, classroom.id),
            provider: db.BillingProvider.Simulator,
            source: db.EntitlementSource.ClassPurchase,
            sourceReference: randomUUID(),
            startsAt: new Date(Date.now() - 60000),
            endsAt: new Date(Date.now() + 86400000),
          }),
        );
        await manager.flush();
      }
      const created = await request(
        'POST',
        `${resourcePrefix}/classes/${classroom.id}/assignments`,
        cookie,
        {
          title: 'Assigned proof practice',
          assessmentMode: 'ungraded_practice',
          feedbackTiming: mode === 'demo' ? 'immediate' : 'on_check',
          solutionAccess: 'never',
          problemVersionIds: [publication.version.id, publication.version.id],
        },
      );
      assert.equal(created.statusCode, 201, created.body);
      const assignment = assignmentResponseSchema.parse(created.json()).assignment;
      assert.equal(assignment.items.length, 2);
      assert(created.body.includes('referenceProof'));
      const first = assignment.items[0]!;
      const second = assignment.items[1]!;
      const published = await request(
        'POST',
        `${resourcePrefix}/assignments/${assignment.id}/publish`,
        cookie,
        {},
      );
      assert.equal(published.statusCode, 200, published.body);
      assert(published.json().assignment.publishedAt);
      if (mode === 'demo') {
        const switched = await request('POST', '/api/demo/role', cookie, { role: 'student' });
        assert.equal(switched.statusCode, 200, switched.body);
        cookie = cookieFrom(switched);
      } else active = { id: student.id, role: 'student' };
      const prefix = `/api/${mode === 'demo' ? 'demo/resources/' : ''}student/assignments/${assignment.id}`;
      const valid = { type: 'derivation' as const, proof: definition.referenceProof! };
      const incomplete = structuredClone(valid);
      incomplete.proof.steps[0]!.formula = 'P &';
      const get = await request('GET', prefix, cookie);
      assert.equal(get.statusCode, 200, get.body);
      assert.equal(get.headers['cache-control'], 'no-store');
      const read = savedStudentAssignmentResponseSchema.parse(get.json());
      assert.equal(read.attempt, null);
      assert.equal(read.assignment.items.length, 2);
      assert(!get.body.includes('referenceProof'));
      assert(!get.body.includes(definition.explanation!));
      assert.equal((await request('GET', prefix, '')).statusCode, 401);
      const check = await request('POST', `${prefix}/check`, cookie, {
        itemId: first.id,
        answers: valid,
      });
      assert.equal(check.statusCode, 200, check.body);
      const feedback = savedStudentCheckResponseSchema.parse(check.json()).feedback;
      assert('type' in feedback && feedback.type === 'derivation');
      assert.equal(feedback.report.status, 'accepted');
      assert(!check.body.includes('referenceProof'));
      assert(!check.body.includes(definition.explanation!));
      assert.equal(
        await orm.em.fork().count(db.AssignmentAttempt, { assignment: assignment.id }),
        0,
      );
      const save = await request('PATCH', `${prefix}/attempt`, cookie, {
        revision: 0,
        itemId: first.id,
        answers: incomplete,
      });
      assert.equal(save.statusCode, 200, save.body);
      const saved = savedStudentAttemptResponseSchema.parse(save.json()).attempt;
      assert.equal(saved.revision, 1);
      assert.deepEqual(saved.answers[first.id], incomplete);
      assert.equal(saved.result, null);
      assert.equal(saved.submittedAt, null);
      assert.equal(saved.score, undefined);
      assert.deepEqual((await request('GET', prefix, cookie)).json().attempt, saved);
      const before = await orm.em.fork().findOneOrFail(db.AssignmentAttempt, saved.id);
      const snapshot = JSON.stringify({
        answers: before.answers,
        revision: before.revision,
        result: before.result,
        score: before.score,
        submittedAt: before.submittedAt,
        updatedAt: before.updatedAt,
      });
      await problems.update(owner.id, problem.id, {
        definition: {
          ...definition,
          conclusion: 'Q',
          referenceProof: null,
          explanation: 'LATER_PRIVATE_REFERENCE',
        },
      });
      const pinnedCheck = await request('POST', `${prefix}/check`, cookie, {
        itemId: first.id,
        answers: valid,
      });
      assert.equal(pinnedCheck.statusCode, 200, pinnedCheck.body);
      assert.deepEqual(pinnedCheck.json().feedback, check.json().feedback);
      assert.equal(
        (await request('GET', `${prefix}/items/${first.id}/solution`, cookie)).statusCode,
        403,
      );
      await orm.em
        .fork()
        .nativeUpdate(db.Assignment, assignment.id, { solutionAccess: db.SolutionAccess.Anytime });
      const solution = await request('GET', `${prefix}/items/${first.id}/solution`, cookie);
      assert.equal(solution.statusCode, 200, solution.body);
      const revealed = savedStudentSolutionResponseSchema.parse(solution.json()).solution;
      assert('type' in revealed && revealed.type === 'derivation');
      assert.deepEqual(revealed.referenceProof, definition.referenceProof);
      assert.equal(revealed.explanation, definition.explanation);
      assert(!solution.body.includes('LATER_PRIVATE_REFERENCE'));
      const after = await orm.em.fork().findOneOrFail(db.AssignmentAttempt, saved.id);
      assert.equal(
        JSON.stringify({
          answers: after.answers,
          revision: after.revision,
          result: after.result,
          score: after.score,
          submittedAt: after.submittedAt,
          updatedAt: after.updatedAt,
        }),
        snapshot,
      );
      assert.equal(
        (await request('POST', `${prefix}/submission`, cookie, { revision: 1 })).statusCode,
        403,
      );
      assert.equal(
        (
          await request('PATCH', `${prefix}/attempt`, cookie, {
            revision: 0,
            itemId: first.id,
            answers: valid,
          })
        ).statusCode,
        409,
      );
      assert.equal(
        (
          await request(
            'POST',
            `${prefix}/check`,
            cookie,
            { itemId: first.id, answers: valid },
            'http://untrusted.test',
          )
        ).statusCode,
        403,
      );
      for (const payload of [
        { revision: 1, itemId: first.id, answers: { ...valid, report: feedback.report } },
        { revision: 1, itemId: first.id, answers: valid, definition },
        { revision: 1, itemId: first.id, answers: valid, score: 100 },
      ])
        assert.equal(
          (await request('PATCH', `${prefix}/attempt`, cookie, payload)).statusCode,
          400,
        );
      assert.equal(
        (
          await request('POST', `${prefix}/check`, cookie, {
            itemId: first.id,
            answers: valid,
            revision: 1,
          })
        ).statusCode,
        400,
      );
      assert.equal(
        (
          await request('PATCH', `${prefix}/attempt`, cookie, {
            revision: 1,
            itemId: randomUUID(),
            answers: valid,
          })
        ).statusCode,
        404,
      );
      const next = await request('PATCH', `${prefix}/attempt`, cookie, {
        revision: 1,
        itemId: second.id,
        answers: {
          type: 'derivation',
          proof: { proofVersion: 1, format: 'fitch', steps: [], blocks: [] },
        },
      });
      assert.equal(next.statusCode, 200, next.body);
      assert.equal(next.json().attempt.revision, 2);
      assert.deepEqual(next.json().attempt.answers[first.id], incomplete);
      if (mode === 'normal') active = { id: outsider.id, role: 'student' };
      for (const [method, suffix, payload] of [
        ['GET', '', undefined],
        ['PATCH', '/attempt', { revision: 0, itemId: first.id, answers: valid }],
        ['POST', '/check', { itemId: first.id, answers: valid }],
        ['GET', `/items/${first.id}/solution`, undefined],
      ] as const)
        assert.equal(
          (await request(method, `${prefix}${suffix}`, otherCookie, payload)).statusCode,
          404,
        );
      assert.equal(
        await orm.em.fork().count(db.AssignmentAttempt, { assignment: assignment.id }),
        1,
      );
      active = { id: normalStudent.id, role: 'student' };
      // Internal-only graded fixture: these HTTP projections must be safe before future admission.
      await orm.em.fork().nativeUpdate(db.Assignment, assignment.id, {
        assessmentMode: db.AssessmentMode.Graded,
        feedbackTiming: db.FeedbackTiming.OnSubmission,
        solutionAccess: db.SolutionAccess.InstructorRelease,
        gradeReleaseTiming: db.GradeReleaseTiming.InstructorRelease,
      });
      const final = await request('POST', `${prefix}/submission`, cookie, { revision: 2 });
      assert.equal(final.statusCode, 200, final.body);
      const receipt = savedStudentAttemptResponseSchema.parse(final.json()).attempt;
      assert.equal(receipt.revision, 3);
      assert(receipt.submittedAt);
      assert.equal(receipt.result, null);
      assert.equal(receipt.score, null);
      assert.equal(receipt.gradePending, true);
      await orm.em.fork().nativeUpdate(db.Assignment, assignment.id, {
        answersRevealedAt: new Date(),
        answersRevealedBy: owner.id,
      });
      assert.deepEqual((await request('GET', prefix, cookie)).json().attempt, receipt);
      assert.equal(
        (await request('GET', `${prefix}/items/${first.id}/solution`, cookie)).statusCode,
        409,
      );
      await orm.em.fork().nativeUpdate(db.Assignment, assignment.id, {
        gradesReleasedAt: new Date(),
        gradesReleasedBy: owner.id,
      });
      const released = await request('GET', prefix, cookie);
      assert.equal(released.statusCode, 200, released.body);
      const retained = savedStudentAssignmentResponseSchema.parse(released.json()).attempt!;
      assert.equal(retained.result?.gradingVersion, 'proof_mixed_v1');
      assert.equal(retained.gradePending, false);
      assert.equal(retained.score!.summary.status, 'needs_review');
      assert.equal(retained.score!.summary.earnedPoints, null);
      assert(!released.body.includes('referenceProof'));
      assert(!released.body.includes(definition.explanation!));
      const retry = await request('POST', `${prefix}/submission`, cookie, { revision: 0 });
      assert.equal(retry.statusCode, 200, retry.body);
      assert.deepEqual(retry.json().attempt, retained);
      assert.equal(
        (
          await request('PATCH', `${prefix}/attempt`, cookie, {
            revision: 3,
            itemId: first.id,
            answers: valid,
          })
        ).statusCode,
        409,
      );
      await orm.em.fork().nativeUpdate(db.Assignment, assignment.id, { archivedAt: new Date() });
      assert.equal((await request('GET', prefix, cookie)).statusCode, 404);
      assert.equal(
        (await request('POST', `${prefix}/check`, cookie, { itemId: first.id, answers: valid }))
          .statusCode,
        404,
      );
    } finally {
      await app?.close();
      await orm.em.execute(`drop schema if exists "${schema}" cascade`);
      await orm.close(true);
    }
  });
}
