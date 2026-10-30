import { randomBytes, randomUUID } from 'node:crypto';
import { generateTruthTable } from '@logiclab/logic-engine';
import type { DemoWorkspace } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { DEMO_TEMPLATE, DEMO_CONCEPTUAL_QUESTIONS } from '../../application/demo/template';
import { createBillingStore } from '../billing/store';
import { createBillingService } from '../../application/billing/service';
import { createSimulatorProvider } from '../../integrations/payments/simulator/provider';
import { createProblemStore } from '../problem/store';
import { createAssignmentStore } from '../assignment/store';
import type { Database, DatabaseManager } from '../transactions';

/** Seed only inside the workspace transaction; simulator events/publication use existing workflows. */
export async function seedDemoWorkspace(
  orm: Database,
  em: DatabaseManager,
  workspace: DemoWorkspace,
) {
  if (!em.isInTransaction()) throw new Error('An active workspace transaction is required.');
  const {
    User,
    UserRole,
    UserIdentityProvider,
    Classroom,
    Enrollment,
    Problem,
    ProblemVersion,
    seedDemoBillingPlan,
  } = await import('@logiclab/db');
  generateTruthTable(DEMO_TEMPLATE.formula);
  const instructor = em.create(User, {
    identityProvider: UserIdentityProvider.Demo,
    demoWorkspace: workspace,
    role: UserRole.Instructor,
  });
  const student = em.create(User, {
    identityProvider: UserIdentityProvider.Demo,
    demoWorkspace: workspace,
    role: UserRole.Student,
  });
  const funded = em.create(Classroom, { name: DEMO_TEMPLATE.fundedClassName, owner: instructor });
  const unpaid = em.create(Classroom, { name: DEMO_TEMPLATE.unpaidClassName, owner: instructor });
  const problem = em.create(Problem, {
    owner: instructor,
    title: DEMO_TEMPLATE.problemTitle,
    instructions: DEMO_TEMPLATE.problemInstructions,
    definition: { type: 'truth_table', definitionVersion: 1, formula: DEMO_TEMPLATE.formula },
  });
  const version = em.create(ProblemVersion, {
    problem,
    version: 1,
    title: problem.title,
    instructions: problem.instructions,
    definition: problem.definition,
  });
  em.persist([
    instructor,
    student,
    funded,
    unpaid,
    problem,
    version,
    em.create(Enrollment, { classroom: funded, student }),
    em.create(Enrollment, { classroom: unpaid, student }),
  ]);
  await em.flush();
  const planId = await seedDemoBillingPlan(orm, em);
  const config = { signingSecret: randomBytes(32).toString('hex') };
  const billing = createBillingService(
    await createBillingStore(orm, em),
    createSimulatorProvider(config),
    config,
  );
  const checkout = await billing.checkout(instructor.id, funded.id, {
    planId,
    requestId: randomUUID(),
  });
  await billing.simulate(instructor.id, checkout.purchase.id, 'paid');
  const assignments = await createAssignmentStore(orm, em);
  const assignment = await assignments.create(instructor.id, funded.id, {
    title: DEMO_TEMPLATE.assignmentTitle,
    instructions: DEMO_TEMPLATE.assignmentInstructions,
    items: [{ problemVersionId: version.id, maxPoints: DEMO_TEMPLATE.assignmentPoints }],
    problemVersionIds: [],
    solutionAccess: 'after_submission',
    assessmentMode: 'graded',
    feedbackTiming: 'on_submission',
  });
  await assignments.publish(instructor.id, assignment.id);
  const problems = await createProblemStore(orm, em);
  const conceptualVersionIds: string[] = [];
  for (const example of DEMO_CONCEPTUAL_QUESTIONS) {
    const draft = await problems.create(instructor.id, example);
    const publication = await problems.publish(instructor.id, draft.id);
    if (publication.status !== 'published') throw new Error('Demo conceptual publication failed.');
    conceptualVersionIds.push(publication.version.id);
  }
  const mixedVersionIds = [version.id, ...conceptualVersionIds];
  const practice = await assignments.create(instructor.id, funded.id, {
    title: DEMO_TEMPLATE.practiceAssignmentTitle,
    instructions: DEMO_TEMPLATE.practiceAssignmentInstructions,
    problemVersionIds: mixedVersionIds,
    assessmentMode: 'ungraded_practice',
    feedbackTiming: 'immediate',
    solutionAccess: 'anytime',
  });
  await assignments.publish(instructor.id, practice.id);
  const mixed = await assignments.create(instructor.id, funded.id, {
    title: DEMO_TEMPLATE.mixedAssignmentTitle,
    instructions: DEMO_TEMPLATE.mixedAssignmentInstructions,
    items: mixedVersionIds.map((problemVersionId, index) => ({
      problemVersionId,
      maxPoints: DEMO_TEMPLATE.mixedPoints[index]!,
    })),
    problemVersionIds: [],
    assessmentMode: 'graded',
    feedbackTiming: 'on_submission',
    gradeReleaseTiming: 'instructor_release',
    solutionAccess: 'instructor_release',
  });
  await assignments.publish(instructor.id, mixed.id);
  return { instructorId: instructor.id, studentId: student.id };
}
