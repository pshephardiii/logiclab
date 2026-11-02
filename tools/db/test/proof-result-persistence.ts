import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  Assignment,
  AssignmentItem,
  AssignmentAttempt,
  User,
  UserRole,
  Classroom,
  Problem,
  ProblemVersion,
  type ProofSubmissionResult,
  type ProofCompletionSubmissionResult,
  AssessmentMode,
  type AssignmentScore,
  type createDatabase,
} from '../src/index.ts';
import { Migration20261102120000 } from '../src/migrations/Migration20261102120000.ts';

export function registerProofResultPersistenceTests(
  orm: Awaited<ReturnType<typeof createDatabase>>,
) {
  async function transaction(work: (em: typeof orm.em) => Promise<void>) {
    const em = orm.em.fork();
    await em.begin();
    try {
      await work(em);
    } finally {
      await em.rollback();
    }
  }
  async function fixture(em: typeof orm.em, pending = false) {
    const owner = em.create(User, {
      cognitoUserPoolId: 'proof-results',
      cognitoSubject: randomUUID(),
      role: UserRole.Instructor,
    });
    const student = em.create(User, {
      cognitoUserPoolId: 'proof-results',
      cognitoSubject: randomUUID(),
      role: UserRole.Student,
    });
    const classroom = em.create(Classroom, { owner, name: 'Proof result persistence' });
    const premiseId = randomUUID();
    const stepId = randomUUID();
    const proof = {
      proofVersion: 1 as const,
      format: 'fitch' as const,
      steps: [{ kind: 'premise' as const, id: stepId, blockId: null, formula: 'P', premiseId }],
      blocks: [],
    };
    const problem = em.create(Problem, {
      owner,
      title: 'Pinned proof',
      definition: {
        type: 'derivation',
        definitionVersion: 1,
        format: 'fitch',
        checkerVersion: 1,
        ruleCatalogVersion: 1,
        premises: [{ id: premiseId, formula: 'P' }],
        conclusion: 'P',
        rules: [],
        referenceProof: proof,
      },
    });
    const version = em.create(ProblemVersion, {
      problem,
      title: problem.title,
      version: 1,
      definition: problem.definition,
    });
    const assignment = em.create(Assignment, { classroom, title: 'Staged retained proof' });
    const item = em.create(AssignmentItem, {
      assignment,
      problemVersion: version,
      position: 1,
      maxPoints: 20,
    });
    const attempt = em.create(AssignmentAttempt, { assignment, student });
    em.persist([owner, student, classroom, problem, version, assignment, item, attempt]);
    await em.flush();
    const result: ProofSubmissionResult = {
      gradingVersion: 'proof_mixed_v1',
      items: [
        {
          type: 'derivation',
          evaluationVersion: 'derivation_v1',
          itemId: item.id,
          problemVersionId: version.id,
          report: {
            checkerVersion: 1,
            ruleCatalogVersion: 1,
            status: pending ? 'needs_review' : 'accepted',
            target: pending ? 'not_established' : 'established',
            steps: pending
              ? []
              : [{ stepId, stepIndex: 0, localStatus: 'valid', dependencyStatus: 'valid' }],
            diagnostics: pending
              ? [{ code: 'INCOMPLETE_PROOF', message: 'No complete proof.' }]
              : [],
          },
        },
      ],
      summary: {
        objective: { correct: 0, incorrect: 0, unanswered: 0, total: 0 },
        proofs: {
          accepted: pending ? 0 : 1,
          needsReview: pending ? 1 : 0,
          unassessable: 0,
          total: 1,
        },
      },
    };
    const score: AssignmentScore = pending
      ? {
          scoringVersion: 'points_v1',
          items: [{ itemId: item.id, maxPoints: 20, status: 'needs_review', earnedPoints: null }],
          summary: { status: 'needs_review', maxPoints: 20, earnedPoints: null, percentage: null },
        }
      : {
          scoringVersion: 'points_v1',
          items: [{ itemId: item.id, maxPoints: 20, status: 'graded', earnedPoints: 20 }],
          summary: { status: 'graded', maxPoints: 20, earnedPoints: 20, percentage: 100 },
        };
    return {
      attempt,
      assignment,
      result,
      score,
      answers: { [item.id]: { type: 'derivation' as const, proof } },
    };
  }
  async function completionFixture(
    em: typeof orm.em,
    status: 'accepted' | 'needs_review' | 'unassessable',
  ) {
    const f = await fixture(em);
    f.assignment.assessmentMode = AssessmentMode.CompletionOnly;
    await em.flush();
    const evidence = f.result.items[0]!;
    if (evidence.type !== 'derivation') throw new Error('Expected proof');
    const report = structuredClone(evidence.report);
    if (status === 'needs_review') {
      report.status = 'needs_review';
      report.target = 'not_established';
      report.steps[0]!.localStatus = 'invalid';
      report.diagnostics = [
        { code: 'RULE_MISMATCH', stepIndex: 0, message: 'Frozen proof error.' },
      ];
    } else if (status === 'unassessable') {
      report.status = 'unassessable';
      report.target = 'unknown';
      report.steps = [];
      report.diagnostics = [
        { code: 'RESOURCE_LIMIT', message: 'Frozen unavailable verification.' },
      ];
    }
    const result: ProofCompletionSubmissionResult = {
      gradingVersion: 'proof_completion_v1',
      items: [{ ...evidence, report, completedResponses: 1, totalResponses: 1 }],
      summary: {
        completedResponses: 1,
        totalResponses: 1,
        proofVerification: {
          verified: status === 'accepted' ? 1 : 0,
          errorsFound: status === 'needs_review' ? 1 : 0,
          unavailable: status === 'unassessable' ? 1 : 0,
          total: 1,
        },
      },
    };
    return { ...f, completion: result };
  }
  for (const status of ['accepted', 'needs_review', 'unassessable'] as const)
    test(`retains score-free ${status} proof completion and instructor verification flags`, async () =>
      transaction(async (em) => {
        const f = await completionFixture(em, status);
        await em.nativeUpdate(AssignmentAttempt, f.attempt.id, {
          answers: f.answers,
          submittedAt: new Date(),
          result: f.completion,
        });
        em.clear();
        const retained = await em.findOneOrFail(AssignmentAttempt, f.attempt.id);
        assert.deepEqual(retained.result, f.completion);
        assert.deepEqual(retained.answers, f.answers);
        assert.equal(retained.score == null, true);
      }));
  test('proof completion rejects awarded points under the existing score-state constraint', async () =>
    transaction(async (em) => {
      const f = await completionFixture(em, 'needs_review');
      await assert.rejects(
        em.nativeUpdate(AssignmentAttempt, f.attempt.id, {
          submittedAt: new Date(),
          result: f.completion,
          score: f.score,
        }),
        /assignment_attempts_score_state_check/,
      );
    }));
  test('proof completion cannot be retained as an unsubmitted draft result', async () =>
    transaction(async (em) => {
      const f = await completionFixture(em, 'accepted');
      await assert.rejects(
        em.nativeUpdate(AssignmentAttempt, f.attempt.id, { result: f.completion }),
        /assignment_attempts_submission_result_check/,
      );
    }));
  test('submitted proof completion answers, reports, flags and revisions are immutable', async () => {
    for (const field of ['answers', 'result', 'score', 'revision', 'delete'] as const)
      await transaction(async (em) => {
        const f = await completionFixture(em, 'needs_review');
        await em.nativeUpdate(AssignmentAttempt, f.attempt.id, {
          answers: f.answers,
          submittedAt: new Date(),
          result: f.completion,
        });
        await assert.rejects(
          field === 'delete'
            ? em.nativeDelete(AssignmentAttempt, f.attempt.id)
            : em.execute(
                `update assignment_attempts set ${field} = ${field === 'revision' ? 'revision + 1' : "'{}'::jsonb"} where id = ?`,
                [f.attempt.id],
              ),
          /Submitted attempts are immutable/,
        );
      });
  });
  test('caller rollback discards proof completion snapshots together with their attempt', async () => {
    let id = '';
    await transaction(async (em) => {
      const f = await completionFixture(em, 'accepted');
      id = f.attempt.id;
      await em.nativeUpdate(AssignmentAttempt, id, {
        answers: f.answers,
        submittedAt: new Date(),
        result: f.completion,
      });
      assert.equal(await em.count(AssignmentAttempt, { id }), 1);
    });
    assert.equal(await orm.em.fork().count(AssignmentAttempt, { id }), 0);
  });
  async function migrate(em: typeof orm.em, direction: 'up' | 'down') {
    const migration = new Migration20261102120000(orm.driver, orm.config);
    migration[direction]();
    for (const sql of migration.getQueries()) await em.execute(sql);
  }
  for (const pending of [false, true])
    test(`retains ${pending ? 'review-needed' : 'accepted'} proof evidence and points without loss`, async () =>
      transaction(async (em) => {
        const f = await fixture(em, pending);
        await em.nativeUpdate(AssignmentAttempt, f.attempt.id, {
          answers: f.answers,
          submittedAt: new Date(),
          result: f.result,
          score: f.score,
        });
        em.clear();
        const saved = await em.findOneOrFail(AssignmentAttempt, f.attempt.id);
        assert.deepEqual(saved.answers, f.answers);
        assert.deepEqual(saved.result, f.result);
        assert.deepEqual(saved.score, f.score);
      }));
  test('submitted proof answers, reports and point snapshots remain immutable', async () => {
    for (const field of ['answers', 'result', 'score', 'delete'] as const)
      await transaction(async (em) => {
        const f = await fixture(em);
        await em.nativeUpdate(AssignmentAttempt, f.attempt.id, {
          answers: f.answers,
          submittedAt: new Date(),
          result: f.result,
          score: f.score,
        });
        await assert.rejects(
          field === 'delete'
            ? em.nativeDelete(AssignmentAttempt, f.attempt.id)
            : em.execute(`update assignment_attempts set ${field} = '{}'::jsonb where id = ?`, [
                f.attempt.id,
              ]),
          /Submitted attempts are immutable/,
        );
      });
  });
  test('proof results require a retained point snapshot', async () =>
    transaction(async (em) => {
      const f = await fixture(em);
      await assert.rejects(
        em.nativeUpdate(AssignmentAttempt, f.attempt.id, {
          submittedAt: new Date(),
          result: f.result,
        }),
        /assignment_attempts_proof_score_required/,
      );
    }));
  test('proof results reject unrecognized point snapshots', async () =>
    transaction(async (em) => {
      const f = await fixture(em);
      await assert.rejects(
        em.execute(
          'update assignment_attempts set submitted_at = now(), result = ?::jsonb, score = ?::jsonb where id = ?',
          [JSON.stringify(f.result), JSON.stringify({ scoringVersion: 'future' }), f.attempt.id],
        ),
        /assignment_attempts_score_state_check/,
      );
    }));
  test('proof storage migration refuses rollback over retained proof history', async () =>
    transaction(async (em) => {
      const f = await fixture(em);
      await em.nativeUpdate(AssignmentAttempt, f.attempt.id, {
        submittedAt: new Date(),
        result: f.result,
        score: f.score,
      });
      await assert.rejects(migrate(em, 'down'), /retained proof results exist/);
    }));
  test('proof storage migration down/up preserves existing objective snapshots exactly', async () =>
    transaction(async (em) => {
      const f = await fixture(em);
      await em.nativeUpdate(AssignmentAttempt, f.attempt.id, {
        submittedAt: new Date(),
        result: {
          gradingVersion: 'truth_table_v1',
          items: [],
          summary: { correct: 0, incorrect: 0, unanswered: 0, total: 0 },
        },
        score: f.score,
      });
      const read = () =>
        em.execute(
          'select answers::text, result::text, score::text, submitted_at from assignment_attempts where id = ?',
          [f.attempt.id],
        );
      const before = await read();
      await migrate(em, 'down');
      await migrate(em, 'up');
      assert.deepEqual(await read(), before);
    }));
  test('the prior schema rejects proof points before the storage migration', async () =>
    transaction(async (em) => {
      const f = await fixture(em);
      await migrate(em, 'down');
      await assert.rejects(
        em.nativeUpdate(AssignmentAttempt, f.attempt.id, {
          submittedAt: new Date(),
          result: f.result,
          score: f.score,
        }),
        /assignment_attempts_score_state_check/,
      );
    }));
}
