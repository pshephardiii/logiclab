import { assignmentFixture, assignment } from './assignment-fixture';
import { detail, submitted } from './student-work-fixture';
export { assignment };
export const submissionSummary = {
  id: submitted.id,
  student: { id: 'b1111111-1111-4111-8111-111111111111', email: 'student@example.test' },
  submittedAt: submitted.submittedAt,
  summary: submitted.result.summary,
};
export const review = {
  submission: submissionSummary,
  assignment: detail.assignment,
  attempt: submitted,
};
export function submissionReviewFixture() {
  const fixture = assignmentFixture();
  fixture.assignments.listSubmissions.mockResolvedValue([submissionSummary]);
  fixture.assignments.findSubmission.mockResolvedValue(review);
  return fixture;
}
