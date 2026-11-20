import { test } from 'node:test';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import { DEMO_TEMPLATE } from '../../src/application/demo/template';
import { DEMO_TRUTH_TREES } from '../../src/application/demo/truth-tree-template';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import {
  savedStudentAssignmentResponseSchema,
  savedStudentAttemptResponseSchema,
} from '@logiclab/contracts/saved-student-work';
import {
  checkTruthTreeReference,
  hasFinishedTruthTreeReference,
} from '../../src/application/problem/truth-tree/authoring';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
const origin = 'http://localhost:5173';

async function fixture(
  check: (
    orm: Awaited<ReturnType<typeof createDatabase>>,
    db: typeof import('@logiclab/db', { with: { 'resolution-mode': 'import' } }),
    runtime: Awaited<ReturnType<typeof createDemoRuntime>>,
  ) => Promise<void>,
) {
  const db = await import('@logiclab/db');
  const schema = `demo_truth_tree_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
  try {
    await orm.schema.create();
    await check(
      orm,
      db,
      await createDemoRuntime(orm, readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: origin })!),
    );
  } finally {
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
}

test('seeded truth-tree practice, grading and completion use scoped HTTP, verified references and independent release', async () =>
  fixture(async (orm, db, runtime) => {
    const app = buildApp({ demo: runtime });
    let cookie = '',
      address = 1;
    async function request(
      method: 'GET' | 'POST' | 'PATCH',
      path: string,
      payload?: object,
      status = 200,
    ) {
      const response = await app.inject({
        method,
        url: path,
        payload,
        headers: { origin, cookie },
        remoteAddress: `127.0.0.${address++}`,
      });
      assert.equal(response.statusCode, status, response.body);
      const header = response.headers['set-cookie'];
      if (header) cookie = (Array.isArray(header) ? header[0]! : header).split(';')[0]!;
      return response;
    }
    try {
      const started = await request('POST', '/api/demo/start', { role: 'student' });
      const workspaceId = started.json().workspace.id as string;
      const em = orm.em.fork();
      const classroom = await em.findOneOrFail(db.Classroom, {
        name: DEMO_TEMPLATE.fundedClassName,
        owner: { demoWorkspace: workspaceId },
      });
      const rows = await em.find(db.Assignment, { classroom: classroom.id });
      assert.equal(rows.length, 9);
      const publications = await em.find(db.ProblemVersion, {
        problem: { owner: { demoWorkspace: workspaceId } },
      });
      const trees = publications.filter((row) => row.definition.type === 'truth_tree');
      assert.equal(trees.length, 2);
      for (const version of trees) {
        assert.equal(hasFinishedTruthTreeReference(version.definition), true);
        assert.equal(checkTruthTreeReference(version.definition).status, 'checked');
      }
      for (const [title, mode] of [
        [DEMO_TEMPLATE.truthTreePracticeAssignmentTitle, 'ungraded_practice'],
        [DEMO_TEMPLATE.truthTreeGradedAssignmentTitle, 'graded'],
        [DEMO_TEMPLATE.truthTreeCompletionAssignmentTitle, 'completion_only'],
      ] as const) {
        const assignment = rows.find((row) => row.title === title)!;
        assert.ok(assignment.publishedAt);
        const path = `/api/demo/resources/student/assignments/${assignment.id}`;
        const read = await request('GET', path);
        const work = savedStudentAssignmentResponseSchema.parse(read.json());
        assert.equal(work.assignment.assessmentMode, mode);
        assert.equal(work.assignment.items.length, 2);
        assert.equal(read.body.includes('referenceTree'), false);
        assert.equal(read.body.includes('explanation'), false);
        let revision = 0;
        for (const [index, item] of work.assignment.items.entries()) {
          const answer = {
            type: 'truth_tree' as const,
            verdict: index === 0 ? ('valid' as const) : ('invalid' as const),
            tree: structuredClone(DEMO_TRUTH_TREES[index]!.definition.referenceTree!),
          };
          if (mode === 'completion_only' && index === 0)
            answer.tree.branches[1]!.ending = {
              kind: 'closed',
              closure: { kind: 'falsity', occurrenceId: answer.tree.occurrences[0]!.id },
            };
          const checked = await request(
            'POST',
            `${path}/check`,
            { itemId: item.id, answers: answer },
            mode === 'ungraded_practice' ? 200 : 403,
          );
          if (mode === 'ungraded_practice') {
            assert.equal(checked.json().feedback.report.status, 'verified');
            assert.equal(
              checked.json().feedback.report.argumentStatus,
              index === 0 ? 'valid' : 'invalid',
            );
            assert.equal(
              await em.fork().count(db.AssignmentAttempt, { assignment: assignment.id }),
              index === 0 ? 0 : 1,
            );
            const solution = await request('GET', `${path}/items/${item.id}/solution`);
            assert.deepEqual(
              solution.json().solution.referenceTree,
              DEMO_TRUTH_TREES[index]!.definition.referenceTree,
            );
          } else await request('GET', `${path}/items/${item.id}/solution`, undefined, 403);
          const saved = await request('PATCH', `${path}/attempt`, {
            revision,
            itemId: item.id,
            answers: answer,
          });
          assert.equal(saved.json().attempt.result, null);
          revision++;
        }
        if (mode === 'ungraded_practice') {
          await request('POST', `${path}/submission`, { revision }, 403);
          continue;
        }
        const final = savedStudentAttemptResponseSchema.parse(
          (await request('POST', `${path}/submission`, { revision })).json(),
        ).attempt;
        if (mode === 'graded') {
          assert.equal(final.gradePending, true);
          assert.equal(final.result, null);
          assert.equal(final.score, null);
        } else {
          assert.equal(final.score, undefined);
          assert.equal(final.result?.gradingVersion, 'proof_completion_v1');
          if (final.result?.gradingVersion !== 'proof_completion_v1')
            throw new Error('Expected completion');
          assert.deepEqual(final.result.summary.proofVerification, {
            verified: 1,
            errorsFound: 1,
            unavailable: 0,
            total: 2,
          });
        }
        await request('POST', '/api/demo/role', { role: 'instructor' });
        const ownerPath = `/api/demo/resources/assignments/${assignment.id}`;
        const review = await request('GET', `${ownerPath}/submissions/${final.id}`);
        assert.equal(review.json().attempt.result.items.length, 2);
        await request('POST', `${ownerPath}/reveal-answers`, {});
        if (mode === 'completion_only')
          await request('POST', `${ownerPath}/release-grades`, {}, 409);
        await request('POST', '/api/demo/role', { role: 'student' });
        await request('GET', `${path}/items/${work.assignment.items[1]!.id}/solution`);
        if (mode === 'graded') {
          assert.equal((await request('GET', path)).json().attempt.result, null);
          await request('POST', '/api/demo/role', { role: 'instructor' });
          await request('POST', `${ownerPath}/release-grades`, {});
          await request('POST', '/api/demo/role', { role: 'student' });
          const released = (await request('GET', path)).json().attempt;
          assert.equal(released.score.summary.earnedPoints, 20);
          assert.equal(released.score.summary.percentage, 100);
          assert.deepEqual(released.result.summary.proofs, {
            accepted: 2,
            needsReview: 0,
            unassessable: 0,
            total: 2,
          });
        }
        const retained = (await request('GET', path)).json().attempt;
        assert.deepEqual(
          (await request('POST', `${path}/submission`, { revision: 0 })).json().attempt,
          retained,
        );
      }
    } finally {
      await app.close();
    }
  }));

test('an exact template-8 visitor keeps saved work until explicit reset loads truth trees without extending its lifetime', async () =>
  fixture(async (orm, db, runtime) => {
    const first = await runtime.workspaces.provision();
    const other = await runtime.workspaces.provision();
    const session = await runtime.sessions.issue(first.workspaceId, 'student');
    const otherSession = await runtime.sessions.issue(other.workspaceId, 'student');
    const em = orm.em.fork();
    const deadline = (
      await em.findOneOrFail(db.DemoWorkspace, first.workspaceId)
    ).expiresAt.getTime();
    const intro = await em.findOneOrFail(db.Assignment, {
      classroom: { owner: { demoWorkspace: first.workspaceId } },
      title: DEMO_TEMPLATE.assignmentTitle,
    });
    const item = await em.findOneOrFail(db.AssignmentItem, { assignment: intro.id });
    const work = await createStudentWorkStore(orm);
    const saved = await work.save(session.actor.id, intro.id, {
      revision: 0,
      itemId: item.id,
      answers: [],
    });
    const otherIds = (
      await em.find(db.ProblemVersion, { problem: { owner: { demoWorkspace: other.workspaceId } } })
    )
      .map((row) => row.id)
      .sort();
    // Build the previous shape through the permitted deletion lifecycle, never by disabling retention guards.
    await em.transactional(async (tx) => {
      await tx.nativeUpdate(db.DemoWorkspace, first.workspaceId, {
        status: db.DemoWorkspaceStatus.Resetting,
      });
      const assignments = await tx.find(db.Assignment, {
        classroom: { owner: { demoWorkspace: first.workspaceId } },
        title: {
          $in: [
            DEMO_TEMPLATE.truthTreePracticeAssignmentTitle,
            DEMO_TEMPLATE.truthTreeGradedAssignmentTitle,
            DEMO_TEMPLATE.truthTreeCompletionAssignmentTitle,
          ],
        },
      });
      const ids = assignments.map((row) => row.id);
      await tx.nativeDelete(db.AssignmentItem, { assignment: { $in: ids } });
      await tx.nativeDelete(db.Assignment, { id: { $in: ids } });
      const problems = (
        await tx.find(db.Problem, { owner: { demoWorkspace: first.workspaceId } })
      ).filter((row) => row.definition.type === 'truth_tree');
      await tx.nativeDelete(db.ProblemVersion, { problem: { $in: problems.map((row) => row.id) } });
      await tx.nativeDelete(db.Problem, { id: { $in: problems.map((row) => row.id) } });
      await tx.nativeUpdate(db.DemoWorkspace, first.workspaceId, {
        status: db.DemoWorkspaceStatus.Active,
        templateVersion: 8,
      });
    });
    assert.equal(
      await em
        .fork()
        .count(db.ProblemVersion, { problem: { owner: { demoWorkspace: first.workspaceId } } }),
      5,
    );
    await runtime.sessions.authenticate(session.sessionId);
    const switched = await runtime.sessions.switchRole(session.sessionId, 'instructor');
    assert.equal(
      (await em.fork().findOneOrFail(db.DemoWorkspace, first.workspaceId)).templateVersion,
      8,
    );
    assert.equal(await em.fork().count(db.AssignmentAttempt, { id: saved.id }), 1);
    assert.equal(
      await em
        .fork()
        .count(db.Assignment, { classroom: { owner: { demoWorkspace: first.workspaceId } } }),
      6,
    );
    const reset = await runtime.workspaces.reset(switched.sessionId);
    await assert.rejects(runtime.sessions.authenticate(switched.sessionId));
    assert.equal((await runtime.sessions.authenticate(reset.sessionId)).generation, 2);
    const fresh = await em.fork().findOneOrFail(db.DemoWorkspace, first.workspaceId);
    assert.equal(fresh.templateVersion, DEMO_TEMPLATE.version);
    assert.equal(fresh.expiresAt.getTime(), deadline);
    assert.equal(await em.fork().count(db.AssignmentAttempt, { id: saved.id }), 0);
    assert.equal(
      await em
        .fork()
        .count(db.ProblemVersion, { problem: { owner: { demoWorkspace: first.workspaceId } } }),
      7,
    );
    assert.equal(
      (await runtime.sessions.authenticate(otherSession.sessionId)).workspaceId,
      other.workspaceId,
    );
    assert.deepEqual(
      (
        await em
          .fork()
          .find(db.ProblemVersion, { problem: { owner: { demoWorkspace: other.workspaceId } } })
      )
        .map((row) => row.id)
        .sort(),
      otherIds,
    );
  }));
