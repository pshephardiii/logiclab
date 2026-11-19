import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { createSubmissionReviewStore } from '../../src/persistence/submission-review/store';
import { createSubmissionGradingStore } from '../../src/persistence/submission-review/grading-store';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import {
  truthTreeDefinitionFixture,
  truthTreeShortCounterexampleFixture,
} from '../truth-tree-fixture';
import type { User, Classroom } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { ResourceUser } from '../../src/routes/resource-context';
import {
  savedStudentAssignmentResponseSchema,
  savedStudentAttemptResponseSchema,
} from '@logiclab/contracts/saved-student-work';
import { submissionReviewSchema } from '@logiclab/contracts';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const origin = 'http://localhost:5173';

for (const demo of [false, true])
  test(`${demo ? 'demo' : 'normal'} truth-tree finals freeze evidence, separate releases and retain completion warnings`, async () => {
    const db = await import('@logiclab/db');
    const schema = `truth_tree_final_${randomUUID().replaceAll('-', '')}`;
    const orm = await db.createDatabase(url, { schema, snapshotOnMigrate: false });
    let app: ReturnType<typeof buildApp> | undefined;
    try {
      await orm.schema.create();
      const em = orm.em.fork();
      const runtime = await createDemoRuntime(
        orm,
        readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: origin })!,
      );
      let owner: User;
      let student: User;
      let classroom: Classroom;
      let cookie = `logiclab_session=${'a'.repeat(43)}`;
      let foreignCookie = cookie;
      if (demo) {
        const workspace = await runtime.workspaces.provision();
        const other = await runtime.workspaces.provision();
        const session = await runtime.sessions.issue(workspace.workspaceId, 'instructor');
        cookie = `logiclab_demo=${session.sessionId}`;
        foreignCookie = `logiclab_demo=${(await runtime.sessions.issue(other.workspaceId, 'instructor')).sessionId}`;
        owner = await em.findOneOrFail(db.User, session.actor.id);
        student = await em.findOneOrFail(db.User, {
          demoWorkspace: workspace.workspaceId,
          role: db.UserRole.Student,
        });
        classroom = await em.findOneOrFail(db.Classroom, {
          owner: owner.id,
          name: 'Demo: Introduction to Logic',
        });
      } else {
        owner = em.create(db.User, {
          cognitoUserPoolId: schema,
          cognitoSubject: 'owner',
          role: db.UserRole.Instructor,
        });
        student = em.create(db.User, {
          cognitoUserPoolId: schema,
          cognitoSubject: 'student',
          role: db.UserRole.Student,
        });
        classroom = em.create(db.Classroom, { owner, name: 'Tree finals' });
        em.persist([
          owner,
          student,
          classroom,
          em.create(db.Enrollment, { student, classroom }),
          em.create(db.ClassEntitlement, {
            classroom,
            provider: db.BillingProvider.Simulator,
            source: db.EntitlementSource.ClassPurchase,
            sourceReference: randomUUID(),
            startsAt: new Date(Date.now() - 60000),
            endsAt: new Date(Date.now() + 86400000),
          }),
        ]);
      }
      const otherOwner = em.create(db.User, {
        cognitoUserPoolId: schema,
        cognitoSubject: 'foreign',
        role: db.UserRole.Instructor,
      });
      em.persist(otherOwner);
      await em.flush();
      let active: ResourceUser = { id: owner.id, role: 'instructor' };
      const context = {
        config: { APP_ORIGIN: origin, secureCookies: false },
        service: { authenticate: async () => active },
      };
      const assignments = await createAssignmentStore(orm);
      const problems = await createProblemStore(orm);
      app = buildApp({
        assignment: {
          ...context,
          assignments,
          submissionReviews: await createSubmissionReviewStore(orm),
          submissionGrading: await createSubmissionGradingStore(orm),
        },
        studentWork: { ...context, studentWork: await createStudentWorkStore(orm) },
        demo: runtime,
      });
      const prefix = demo ? '/api/demo/resources' : '/api';
      let address = 1;
      const request = (
        method: 'GET' | 'POST' | 'PATCH',
        path: string,
        payload?: object,
        suppliedCookie = cookie,
      ) =>
        app!.inject({
          method,
          url: `${prefix}${path}`,
          payload,
          headers: { origin, cookie: suppliedCookie },
          remoteAddress: `127.0.0.${address++}`,
        });
      async function as(role: 'instructor' | 'student') {
        active = { id: role === 'instructor' ? owner.id : student.id, role };
        if (demo) {
          const response = await app!.inject({
            method: 'POST',
            url: '/api/demo/role',
            headers: { origin, cookie },
            payload: { role },
          });
          assert.equal(response.statusCode, 200, response.body);
          const header = response.headers['set-cookie'];
          if (header) cookie = (Array.isArray(header) ? header[0]! : header).split(';')[0]!;
        }
      }
      const definitions = [
        truthTreeDefinitionFixture(),
        truthTreeDefinitionFixture('invalid'),
        truthTreeShortCounterexampleFixture(),
      ];
      const versionIds: string[] = [];
      for (const definition of definitions) {
        const problem = await problems.create(owner.id, { title: 'Pinned tree', definition });
        const version = await problems.publish(owner.id, problem.id);
        assert.equal(version.status, 'published');
        if (version.status !== 'published') throw new Error('Expected publication');
        versionIds.push(version.version.id);
      }
      const concept = await problems.create(owner.id, {
        title: 'Concept',
        definition: {
          type: 'true_false',
          definitionVersion: 1,
          question: 'Is this true?',
          correctAnswer: false,
          explanation: 'PRIVATE_CONCEPT_EXPLANATION',
        },
      });
      const conceptVersion = await problems.publish(owner.id, concept.id);
      if (conceptVersion.status !== 'published') throw new Error('Expected concept publication');
      const classPath = `/classes/${classroom.id}/assignments`;
      // A verified short refutation is legal, but cannot model completion's all-path requirement.
      const rejected = await request('POST', classPath, {
        title: 'Unfinished reference',
        assessmentMode: 'completion_only',
        feedbackTiming: 'on_submission',
        problemVersionIds: [versionIds[2]],
      });
      assert.equal(rejected.statusCode, 409, rejected.body);
      assert.equal(rejected.json().error.code, 'TRUTH_TREE_COMPLETION_REFERENCE_REQUIRED');
      assert.equal(rejected.body.includes('PRIVATE_TRUTH_TREE_EXPLANATION'), false);
      const shortDraft = await request('POST', classPath, {
        title: 'Short reference graded',
        assessmentMode: 'graded',
        feedbackTiming: 'on_submission',
        problemVersionIds: [versionIds[2]],
      });
      assert.equal(shortDraft.statusCode, 201, shortDraft.body);
      const shortPath = `/assignments/${shortDraft.json().assignment.id}`;
      const edit = await request('PATCH', shortPath, {
        title: 'Must roll back',
        assessmentMode: 'completion_only',
      });
      assert.equal(edit.statusCode, 409, edit.body);
      assert.equal(
        (await request('GET', shortPath)).json().assignment.title,
        'Short reference graded',
      );
      await em.nativeUpdate(db.Assignment, shortDraft.json().assignment.id, {
        assessmentMode: db.AssessmentMode.CompletionOnly,
      });
      assert.equal((await request('POST', `${shortPath}/publish`, {})).statusCode, 409);
      assert.equal(
        (await em.fork().findOneOrFail(db.Assignment, shortDraft.json().assignment.id)).publishedAt,
        null,
      );

      const created = await request('POST', classPath, {
        title: 'Mixed tree graded',
        assessmentMode: 'graded',
        feedbackTiming: 'on_submission',
        gradeReleaseTiming: 'instructor_release',
        solutionAccess: 'instructor_release',
        items: [
          { problemVersionId: versionIds[0], maxPoints: 20 },
          { problemVersionId: versionIds[1], maxPoints: 5 },
          { problemVersionId: conceptVersion.version.id, maxPoints: 5 },
        ],
      });
      assert.equal(created.statusCode, 201, created.body);
      const assignmentId = created.json().assignment.id as string;
      const path = `/student/assignments/${assignmentId}`;
      const ownerPath = `/assignments/${assignmentId}`;
      assert.equal((await request('POST', `${ownerPath}/publish`, {})).statusCode, 200);
      await as('student');
      const initial = await request('GET', path);
      assert.equal(initial.statusCode, 200, initial.body);
      assert.equal(initial.body.includes('referenceTree'), false);
      const work = savedStudentAssignmentResponseSchema.parse(initial.json());
      const [first, second, question] = work.assignment.items;
      assert.ok(first && second && question);
      assert.equal(first.maxPoints, 20);
      const wrong = { type: 'truth_tree', tree: structuredClone(definitions[0]!.referenceTree!) };
      wrong.tree.occurrences[0]!.formula = 'Q';
      const refutation = { type: 'truth_tree', tree: definitions[1]!.referenceTree! };
      let revision = 0;
      for (const [itemId, answers] of [
        [first.id, wrong],
        [second.id, refutation],
        [question.id, { type: 'true_false', answer: false }],
      ] as const) {
        const saved = await request('PATCH', `${path}/attempt`, { revision, itemId, answers });
        assert.equal(saved.statusCode, 200, saved.body);
        assert.equal(saved.json().attempt.result, null);
        revision++;
      }
      assert.equal(
        (await request('POST', `${path}/check`, { itemId: first.id, answers: wrong })).statusCode,
        403,
      );
      assert.equal((await request('GET', `${path}/items/${first.id}/solution`)).statusCode, 403);
      assert.equal((await request('POST', `${path}/submission`, { revision: 0 })).statusCode, 409);
      const finals = await Promise.all([
        request('POST', `${path}/submission`, { revision }),
        request('POST', `${path}/submission`, { revision }),
      ]);
      for (const final of finals) assert.equal(final.statusCode, 200, final.body);
      assert.deepEqual(finals[0]!.json(), finals[1]!.json());
      const hidden = savedStudentAttemptResponseSchema.parse(finals[0]!.json()).attempt;
      assert.equal(hidden.result, null);
      assert.equal(hidden.score, null);
      assert.equal(hidden.gradePending, true);
      assert.equal(finals[0]!.body.includes('report'), false);
      const submissionId = hidden.id;
      await as('instructor');
      const reviewPath = `${ownerPath}/submissions/${submissionId}`;
      const reviewResponse = await request('GET', reviewPath);
      assert.equal(reviewResponse.statusCode, 200, reviewResponse.body);
      const review = submissionReviewSchema.parse(reviewResponse.json());
      assert.equal(review.attempt.result?.gradingVersion, 'proof_mixed_v1');
      assert.equal(review.attempt.score?.summary.status, 'needs_review');
      assert.equal(reviewResponse.body.includes('PRIVATE_TRUTH_TREE_EXPLANATION'), false);
      const original = await em.fork().findOneOrFail(db.AssignmentAttempt, submissionId);
      const frozen = structuredClone({
        result: original.result,
        score: original.score,
        answers: original.answers,
      });
      assert.deepEqual(
        original.score?.items.map((item) => item.earnedPoints),
        [null, 5, 5],
      );
      const adjustment = await request('PATCH', `${reviewPath}/grading`, {
        revision: 0,
        items: [{ itemId: first.id, earnedPoints: 12, comment: 'Review this closure.' }],
      });
      assert.equal(adjustment.statusCode, 200, adjustment.body);
      assert.equal(adjustment.json().score.summary.earnedPoints, 22);
      assert.equal((await request('POST', `${ownerPath}/reveal-answers`, {})).statusCode, 200);
      await as('student');
      const revealed = await request('GET', `${path}/items/${second.id}/solution`);
      assert.equal(revealed.statusCode, 200, revealed.body);
      assert.equal(revealed.json().solution.argumentStatus, 'invalid');
      assert.ok(revealed.json().solution.counterexample);
      assert.equal(
        (await request('GET', path)).json().attempt.result,
        null,
        'Answer reveal does not release grades or reports.',
      );
      await as('instructor');
      assert.equal((await request('POST', `${ownerPath}/release-grades`, {})).statusCode, 200);
      await as('student');
      const visible = await request('GET', path);
      assert.equal(visible.statusCode, 200, visible.body);
      const released = savedStudentAssignmentResponseSchema.parse(visible.json()).attempt!;
      assert.deepEqual(released.result, frozen.result);
      assert.equal(released.score?.summary.earnedPoints, 22);
      assert.equal(released.instructorGrading?.items[0]?.comment, 'Review this closure.');
      assert.equal(visible.body.includes('PRIVATE_TRUTH_TREE_EXPLANATION'), false);
      const retry = await request('POST', `${path}/submission`, { revision: 0 });
      assert.equal(retry.statusCode, 200, retry.body);
      assert.deepEqual(retry.json().attempt, released);
      assert.equal(
        (
          await request('PATCH', `${path}/attempt`, {
            revision: released.revision,
            itemId: first.id,
            answers: wrong,
          })
        ).statusCode,
        409,
      );
      await as('instructor');
      active = { id: otherOwner.id, role: 'instructor' };
      assert.equal((await request('GET', reviewPath, undefined, foreignCookie)).statusCode, 404);
      await as('instructor');
      const retained = await em.fork().findOneOrFail(db.AssignmentAttempt, submissionId);
      assert.deepEqual(
        { result: retained.result, score: retained.score, answers: retained.answers },
        frozen,
      );
      assert.equal(
        await em.fork().count(db.SubmissionGradingRevision, { attempt: submissionId }),
        1,
      );

      const completeDraft = await request('POST', classPath, {
        title: 'Tree completion',
        assessmentMode: 'completion_only',
        feedbackTiming: 'on_submission',
        solutionAccess: 'instructor_release',
        problemVersionIds: [versionIds[1], conceptVersion.version.id],
      });
      assert.equal(completeDraft.statusCode, 201, completeDraft.body);
      const completionId = completeDraft.json().assignment.id;
      const completionOwnerPath = `/assignments/${completionId}`;
      assert.equal((await request('POST', `${completionOwnerPath}/publish`, {})).statusCode, 200);
      const [treeItem, choiceItem] = completeDraft.json().assignment.items as { id: string }[];
      assert.ok(treeItem && choiceItem);
      await as('student');
      const completionPath = `/student/assignments/${completionId}`;
      const unfinished = {
        type: 'truth_tree',
        tree: {
          treeVersion: 1,
          format: 'truth_tree',
          rootBranchId: null,
          occurrences: [],
          branches: [],
          expansions: [],
        },
      };
      assert.equal(
        (
          await request('PATCH', `${completionPath}/attempt`, {
            revision: 0,
            itemId: treeItem.id,
            answers: unfinished,
          })
        ).statusCode,
        200,
      );
      assert.equal(
        (
          await request('PATCH', `${completionPath}/attempt`, {
            revision: 1,
            itemId: choiceItem.id,
            answers: { type: 'true_false', answer: true },
          })
        ).statusCode,
        200,
      );
      const incomplete = await request('POST', `${completionPath}/submission`, { revision: 2 });
      assert.equal(incomplete.statusCode, 409, incomplete.body);
      assert.equal(incomplete.json().error.code, 'ATTEMPT_INCOMPLETE');
      const badClosure = structuredClone(refutation);
      badClosure.tree.branches[0]!.ending = {
        kind: 'closed',
        closure: {
          kind: 'complement',
          occurrenceIds: badClosure.tree.occurrences.map((item) => item.id) as [string, string],
        },
      };
      assert.equal(
        (
          await request('PATCH', `${completionPath}/attempt`, {
            revision: 2,
            itemId: treeItem.id,
            answers: badClosure,
          })
        ).statusCode,
        200,
      );
      assert.equal(
        (
          await request('POST', `${completionPath}/check`, {
            itemId: treeItem.id,
            answers: badClosure,
          })
        ).statusCode,
        403,
      );
      const completed = await request('POST', `${completionPath}/submission`, { revision: 3 });
      assert.equal(completed.statusCode, 200, completed.body);
      const completion = savedStudentAttemptResponseSchema.parse(completed.json()).attempt;
      assert.equal(completion.score, undefined);
      assert.equal(completion.result?.gradingVersion, 'proof_completion_v1');
      if (completion.result?.gradingVersion !== 'proof_completion_v1')
        throw new Error('Expected proof completion');
      assert.deepEqual(completion.result.summary.proofVerification, {
        verified: 0,
        errorsFound: 1,
        unavailable: 0,
        total: 1,
      });
      assert.equal(completed.body.includes('PRIVATE_TRUTH_TREE_EXPLANATION'), false);
      assert.equal(
        (await request('GET', `${completionPath}/items/${treeItem.id}/solution`)).statusCode,
        403,
      );
      await as('instructor');
      const completionReview = await request(
        'GET',
        `${completionOwnerPath}/submissions/${completion.id}`,
      );
      assert.equal(completionReview.statusCode, 200, completionReview.body);
      assert.equal(submissionReviewSchema.parse(completionReview.json()).attempt.score, undefined);
      assert.equal(
        (await request('POST', `${completionOwnerPath}/release-grades`, {})).statusCode,
        409,
      );
      assert.equal(
        (
          await request('PATCH', `${completionOwnerPath}/submissions/${completion.id}/grading`, {
            revision: 0,
            items: [{ itemId: treeItem.id, earnedPoints: 1, comment: null }],
          })
        ).statusCode,
        409,
      );
      assert.equal(
        (await request('POST', `${completionOwnerPath}/reveal-answers`, {})).statusCode,
        200,
      );
      await as('student');
      assert.equal(
        (await request('GET', `${completionPath}/items/${treeItem.id}/solution`)).statusCode,
        200,
      );
      assert.deepEqual(
        (await request('POST', `${completionPath}/submission`, { revision: 0 })).json().attempt,
        completion,
      );
    } finally {
      await app?.close();
      await orm.em.execute(`drop schema if exists "${schema}" cascade`);
      await orm.close(true);
    }
  });
