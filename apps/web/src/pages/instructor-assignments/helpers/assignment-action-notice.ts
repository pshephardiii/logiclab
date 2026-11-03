import type { AssignmentDetail } from '@logiclab/contracts';

export function assignmentActionNotice(
  action: 'publish' | 'archive' | 'restore' | 'release-grades' | 'reveal-answers',
  assessmentMode: AssignmentDetail['assessmentMode'],
) {
  return action === 'release-grades'
    ? 'Grades released. Answer access is unchanged.'
    : action === 'reveal-answers'
      ? assessmentMode === 'completion_only'
        ? 'Answers revealed. Completion status is unchanged.'
        : 'Answers revealed. Grade release is unchanged.'
      : action === 'publish'
        ? 'Assignment published. Content and policy are locked.'
        : action === 'archive'
          ? 'Assignment archived.'
          : 'Assignment restored.';
}
