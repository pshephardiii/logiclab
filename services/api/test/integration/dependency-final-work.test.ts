import { ProofMethodUnavailableError } from '../../src/application/proof/availability';
import { calculateSubmissionResult } from '../../src/persistence/student-work/submission-result';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import type { AssignmentItem } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  dependencyDefinitionFixture,
  derivationDefinitionFixture,
  treeDefinitionFixture,
} from '../derivation-fixture';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createStudentWorkStore } from '../../src/persistence/student-work/store';
import { createSubmissionReviewStore } from '../../src/persistence/submission-review/store';
import { createSubmissionGradingStore } from '../../src/persistence/submission-review/grading-store';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import { StudentWorkError } from '../../src/application/student-work/errors';
import {
  savedStudentAssignmentResponseSchema,
  savedStudentAnswersSchema,
  savedDerivationAnswerSchema,
  type SavedStudentResponseValue,
} from '@logiclab/contracts/saved-student-work';
import { submissionReviewSchema } from '@logiclab/contracts';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
for (const [mode, definitionFixture] of (['normal', 'demo'] as const).flatMap((mode) =>
  [dependencyDefinitionFixture, treeDefinitionFixture].map(
    (definitionFixture) => [mode, definitionFixture] as const,
  ),
))
  for (const assessment of ['graded', 'completion_only'] as const) {
    test(`${mode} ${definitionFixture().format} ${assessment} finalization freezes mixed-format evidence, isolates review and preserves independent release`, async () => {
      const db = await import('@logiclab/db');
      const schema = `dependency_final_${randomUUID().replaceAll('-', '')}`;
      const orm = await db.createDatabase(url, { schema, snapshotOnMigrate: false });
      try {
        await orm.schema.create();
        const em = orm.em.fork();
        const runtime =
          mode === 'demo'
            ? await createDemoRuntime(
                orm,
                readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: 'http://localhost:5173' })!,
              )
            : null;
        const workspace = runtime ? await runtime.workspaces.provision() : null;
        const studentSession =
          runtime && workspace
            ? await runtime.sessions.issue(workspace.workspaceId, 'student')
            : null;
        const ownerSession =
          runtime && workspace
            ? await runtime.sessions.issue(workspace.workspaceId, 'instructor')
            : null;
        let owner, student, classroom;
        if (workspace) {
          owner = await em.findOneOrFail(db.User, {
            demoWorkspace: workspace.workspaceId,
            role: db.UserRole.Instructor,
          });
          student = await em.findOneOrFail(db.User, {
            demoWorkspace: workspace.workspaceId,
            role: db.UserRole.Student,
          });
          classroom = await em.findOneOrFail(db.Classroom, {
            owner,
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
          classroom = em.create(db.Classroom, { owner, name: 'Dependency final test' });
          em.persist([owner, student, classroom, em.create(db.Enrollment, { classroom, student })]);
          await em.flush();
        }
        const stranger = em.create(db.User, {
          cognitoUserPoolId: schema,
          cognitoSubject: 'stranger',
          role: db.UserRole.Instructor,
        });
        em.persist(stranger);
        await em.flush();
        const problems = await createProblemStore(orm);
        const primary = definitionFixture(),
          fitch = derivationDefinitionFixture();
        const definitionList = [
          primary,
          primary,
          fitch,
          {
            type: 'true_false' as const,
            definitionVersion: 1 as const,
            question: 'P implies P?',
            correctAnswer: true,
            explanation: 'PRIVATE_CONCEPTUAL_KEY',
          },
        ];
        // Direct persistence fixture isolates finalization/review from authoring.
        const assignment = em.create(db.Assignment, {
          classroom,
          title: 'Mixed dependency final',
          assessmentMode:
            assessment === 'graded' ? db.AssessmentMode.Graded : db.AssessmentMode.CompletionOnly,
          feedbackTiming: db.FeedbackTiming.OnSubmission,
          gradeReleaseTiming:
            assessment === 'graded'
              ? db.GradeReleaseTiming.InstructorRelease
              : db.GradeReleaseTiming.OnSubmission,
          solutionAccess: db.SolutionAccess.InstructorRelease,
        });
        em.persist(assignment);
        const items: AssignmentItem[] = [];
        for (const [index, definition] of definitionList.entries()) {
          let version;
          if (definition.type === 'derivation' && definition.format === 'tree') {
            // Historical tree setup is direct data, never a newly admitted authoring operation.
            const problem = em.create(db.Problem, {
              owner,
              title: `Retained item ${index + 1}`,
              definition,
            });
            version = em.create(db.ProblemVersion, {
              problem,
              version: 1,
              title: problem.title,
              definition,
            });
            em.persist([problem, version]);
            await em.flush();
          } else {
            const draft = await problems.create(owner.id, {
              title: `Final item ${index + 1}`,
              definition,
            });
            const published = await problems.publish(owner.id, draft.id);
            if (published.status !== 'published') assert.fail('Expected publication');
            version = em.getReference(db.ProblemVersion, published.version.id);
          }
          const item = em.create(db.AssignmentItem, {
            assignment,
            position: index + 1,
            maxPoints: [20, 10, 5, 5][index]!,
            problemVersion: version,
          });
          items.push(item);
          em.persist(item);
        }
        await em.flush();
        assignment.publishedAt = new Date();
        await em.flush();
        const assignments = runtime
          ? runtime.context.assignments
          : await createAssignmentStore(orm);
        const directStudent = await createStudentWorkStore(orm);
        const directReviews = await createSubmissionReviewStore(orm);
        const directGrading = await createSubmissionGradingStore(orm);
        const studentStore = runtime ? runtime.context.studentWork : directStudent;
        const reviewStore = runtime ? runtime.context.submissionReviews : directReviews;
        const gradingStore = runtime ? runtime.context.submissionGrading : directGrading;
        const studentRun = <T>(write: boolean, work: () => Promise<T>) =>
          runtime ? runtime.run(studentSession!.sessionId, write, work) : work();
        const ownerRun = <T>(write: boolean, work: () => Promise<T>) =>
          runtime ? runtime.run(ownerSession!.sessionId, write, work) : work();
        const bad = structuredClone(primary.referenceProof!);
        const firstNode = 'steps' in bad ? bad.steps[0]! : bad.nodes[0]!;
        firstNode.formula = 'Q';
        const answers: SavedStudentResponseValue[] = [
          savedDerivationAnswerSchema.parse({ type: 'derivation', proof: primary.referenceProof }),
          savedDerivationAnswerSchema.parse({ type: 'derivation', proof: bad }),
          { type: 'derivation' as const, proof: fitch.referenceProof! },
          { type: 'true_false' as const, answer: true },
        ];
        if (primary.format === 'tree') {
          // Unavailable items freeze the complete mixed assignment, including its active/objective items.
          for (const index of [0, 2, 3])
            await assert.rejects(
              studentRun(true, () =>
                studentStore.save(
                  student.id,
                  assignment.id,
                  savedStudentAnswersSchema.parse({
                    revision: 0,
                    itemId: items[index]!.id,
                    answers: answers[index],
                  }),
                ),
              ),
              ProofMethodUnavailableError,
            );
          await assert.rejects(
            studentRun(true, () => studentStore.submit(student.id, assignment.id, 0)),
            ProofMethodUnavailableError,
          );
          assert.equal(
            await em.fork().count(db.AssignmentAttempt, { assignment: assignment.id }),
            0,
          );
          // Historical finals are explicit fixtures. Never call a new-work endpoint to manufacture one.
          await em.populate(items, ['problemVersion']);
          const retainedAnswers = {
            [items[0]!.id]: answers[0]!,
            [items[1]!.id]: answers[0]!,
            [items[2]!.id]: answers[2]!,
            [items[3]!.id]: answers[3]!,
          };
          const calculated = calculateSubmissionResult(assignment, items, retainedAnswers);
          const retained = em.create(db.AssignmentAttempt, {
            assignment,
            student,
            answers: retainedAnswers,
            result: calculated.result,
            ...(calculated.score ? { score: calculated.score } : {}),
            submittedAt: new Date(),
            revision: 5,
          });
          em.persist(retained);
          await em.flush();
          const read = await studentRun(false, () => studentStore.read(student.id, assignment.id));
          assert.equal(read.attempt!.revision, 5);
          assert.equal(read.attempt!.gradePending, assessment === 'graded');
          if (assessment === 'graded') assert.equal(read.attempt!.result, null);
          const review = await ownerRun(false, () =>
            reviewStore.findSubmission(owner.id, assignment.id, retained.id),
          );
          assert.deepEqual(review.attempt.result, calculated.result);
          await ownerRun(true, () => assignments.release(owner.id, assignment.id, 'answers'));
          const reference = await studentRun(false, () =>
            studentStore.solution(student.id, assignment.id, items[0]!.id),
          );
          assert('type' in reference.solution && reference.solution.type === 'derivation');
          assert.deepEqual(reference.solution.referenceProof, primary.referenceProof);
          if (assessment === 'graded')
            await ownerRun(true, () => assignments.release(owner.id, assignment.id, 'grades'));
          const replay = await studentRun(true, () =>
            studentStore.submit(student.id, assignment.id, 0),
          );
          assert.equal(replay.revision, 5);
          assert.deepEqual(replay.answers, retainedAnswers);
          assert.deepEqual(replay.result, calculated.result);
          assert.deepEqual(replay.score, calculated.score);
          return;
        }
        for (const [index, answer] of answers.entries())
          await studentRun(true, () =>
            studentStore.save(
              student.id,
              assignment.id,
              savedStudentAnswersSchema.parse({
                revision: index,
                itemId: items[index]!.id,
                answers: answer,
              }),
            ),
          );
        assert.equal(
          (
            await ownerRun(false, () =>
              reviewStore.listSubmissions(owner.id, assignment.id, { limit: 20, offset: 0 }),
            )
          ).length,
          0,
        );
        let revision = 4;
        if (assessment === 'completion_only') {
          const unfinished = structuredClone(bad);
          const last =
            'steps' in unfinished
              ? unfinished.steps.at(-1)!
              : unfinished.nodes.find((node) => node.id === unfinished.rootId)!;
          if (last.kind !== 'inference') assert.fail('Expected inference');
          last.ruleId = null;
          await studentRun(true, () =>
            studentStore.save(
              student.id,
              assignment.id,
              savedStudentAnswersSchema.parse({
                revision,
                itemId: items[1]!.id,
                answers: { type: 'derivation', proof: unfinished },
              }),
            ),
          );
          revision++;
          await assert.rejects(
            studentRun(true, () => studentStore.submit(student.id, assignment.id, revision)),
            (error) => error instanceof StudentWorkError && error.reason === 'incomplete_work',
          );
          const row = await em.fork().findOneOrFail(db.AssignmentAttempt, {
            assignment: assignment.id,
            student: student.id,
          });
          assert.equal(row.result, null);
          assert.equal(row.submittedAt, null);
          await studentRun(true, () =>
            studentStore.save(
              student.id,
              assignment.id,
              savedStudentAnswersSchema.parse({
                revision,
                itemId: items[1]!.id,
                answers: answers[1]!,
              }),
            ),
          );
          revision++;
        }
        // A caller failure after successful calculation/persistence must leave the draft intact.
        await assert.rejects(
          orm.em.fork().transactional(async (manager) => {
            const transactional = await createStudentWorkStore(orm, manager);
            await transactional.submit(student.id, assignment.id, revision);
            throw new Error('ROLLBACK_DEPENDENCY_FINAL');
          }),
          /ROLLBACK_DEPENDENCY_FINAL/,
        );
        assert.equal(
          (
            await em.fork().findOneOrFail(db.AssignmentAttempt, {
              assignment: assignment.id,
              student: student.id,
            })
          ).submittedAt,
          null,
        );
        const finals = await Promise.all([
          studentRun(true, () => studentStore.submit(student.id, assignment.id, revision)),
          studentRun(true, () => studentStore.submit(student.id, assignment.id, revision)),
        ]);
        assert.deepEqual(finals[0], finals[1]);
        const final = finals[0]!;
        assert(final.submittedAt);
        assert.equal(final.revision, revision + 1);
        const retained = await em.fork().findOneOrFail(db.AssignmentAttempt, final.id);
        const frozen = JSON.stringify({
          answers: retained.answers,
          result: retained.result,
          score: retained.score,
          revision: retained.revision,
          submittedAt: retained.submittedAt,
        });
        const review = await ownerRun(false, () =>
          reviewStore.findSubmission(owner.id, assignment.id, final.id),
        );
        submissionReviewSchema.parse(review);
        assert.equal(
          review.attempt.answers[items[0]!.id] &&
            (review.attempt.answers[items[0]!.id] as { proof: { format: string } }).proof.format,
          primary.format,
        );
        assert(!JSON.stringify(review.assignment).includes('referenceProof'));
        assert(!JSON.stringify(review).includes('PRIVATE_CONCEPTUAL_KEY'));
        await assert.rejects(directReviews.findSubmission(stranger.id, assignment.id, final.id));
        if (assessment === 'graded') {
          assert(final.gradePending);
          assert.equal(final.result, null);
          assert.equal(final.score, null);
          assert.equal(review.attempt.result?.gradingVersion, 'proof_mixed_v1');
          assert.equal(review.attempt.score?.summary.status, 'needs_review');
          const automatic = review.attempt.score?.items.find(
            (item) => item.itemId === items[1]!.id,
          );
          assert.equal(automatic?.earnedPoints, null);
          const graded = await ownerRun(true, () =>
            gradingStore.update(owner.id, assignment.id, final.id, {
              revision: 0,
              items: [
                {
                  itemId: items[1]!.id,
                  earnedPoints: 7,
                  comment: 'Good continuation after the first mistake.',
                },
              ],
            }),
          );
          assert.equal(graded.score.summary.earnedPoints, 37);
          assert(
            (await studentRun(false, () => studentStore.read(student.id, assignment.id))).attempt!
              .gradePending,
          );
        } else {
          assert.equal(final.result?.gradingVersion, 'proof_completion_v1');
          assert.equal(final.score, undefined);
          if (final.result?.gradingVersion !== 'proof_completion_v1')
            assert.fail('Expected completion');
          assert.deepEqual(final.result.summary.proofVerification, {
            verified: 2,
            errorsFound: 1,
            unavailable: 0,
            total: 3,
          });
          assert.equal(final.result.summary.completedResponses, 4);
          assert.equal(review.attempt.score, undefined);
          await assert.rejects(
            ownerRun(false, () => gradingStore.read(owner.id, assignment.id, final.id)),
          );
        }
        await assert.rejects(
          studentRun(false, () => studentStore.solution(student.id, assignment.id, items[0]!.id)),
          (error) => error instanceof StudentWorkError && error.reason === 'solution_locked',
        );
        await ownerRun(true, () => assignments.release(owner.id, assignment.id, 'answers'));
        const solution = await studentRun(false, () =>
          studentStore.solution(student.id, assignment.id, items[0]!.id),
        );
        assert('type' in solution.solution && solution.solution.type === 'derivation');
        assert.equal(solution.solution.format, primary.format);
        if (assessment === 'graded') {
          assert(
            (await studentRun(false, () => studentStore.read(student.id, assignment.id))).attempt!
              .gradePending,
          );
          await ownerRun(true, () => assignments.release(owner.id, assignment.id, 'grades'));
          const released = await studentRun(false, () =>
            studentStore.read(student.id, assignment.id),
          );
          savedStudentAssignmentResponseSchema.parse(released);
          assert.equal(released.attempt!.score!.summary.earnedPoints, 37);
          assert.equal(
            released.attempt!.instructorGrading!.items[0]!.comment,
            'Good continuation after the first mistake.',
          );
        }
        const after = await em.fork().findOneOrFail(db.AssignmentAttempt, final.id);
        assert.equal(
          JSON.stringify({
            answers: after.answers,
            result: after.result,
            score: after.score,
            revision: after.revision,
            submittedAt: after.submittedAt,
          }),
          frozen,
        );
        await assert.rejects(
          studentRun(true, () =>
            studentStore.save(
              student.id,
              assignment.id,
              savedStudentAnswersSchema.parse({
                revision: final.revision,
                itemId: items[0]!.id,
                answers: answers[0]!,
              }),
            ),
          ),
          (error) => error instanceof StudentWorkError && error.reason === 'submitted',
        );
      } finally {
        await orm.em.execute(`drop schema if exists "${schema}" cascade`);
        await orm.close(true);
      }
    });
  }
