import type { SubmissionReviewStore } from '../../persistence/submission-review/types';
import type { ResourceContext } from '../resource-context';
import type { AssignmentStore } from '../../persistence/assignment/types';

export type AssignmentContext = ResourceContext & {
  assignments: AssignmentStore;
  submissionReviews: SubmissionReviewStore;
};
