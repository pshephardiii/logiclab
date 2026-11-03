import type { AssignmentScore, ReleasedInstructorGrading } from '@logiclab/contracts';
import './instructor-grading-feedback.css';

/** Receives only released decisions; original checker findings and reference answers are separate. */
export function InstructorGradingFeedback({
  grading,
  automaticScore,
  items,
}: {
  grading: ReleasedInstructorGrading;
  automaticScore: AssignmentScore;
  items?: readonly { id: string; title: string }[];
}) {
  return (
    <section aria-label="Instructor feedback">
      <h3>Instructor feedback</h3>
      <p>Points reflect the latest instructor decisions. Original answer checks are retained.</p>
      <ul>
        {grading.items.map((decision) => {
          const position =
            items?.findIndex((item) => item.id === decision.itemId) ??
            automaticScore.items.findIndex((item) => item.itemId === decision.itemId);
          const automatic = automaticScore.items.find((item) => item.itemId === decision.itemId);
          return (
            <li key={decision.itemId}>
              <strong>
                Problem {position + 1}
                {items?.[position]?.title ? `: ${items[position]!.title}` : ''}
              </strong>
              <p>
                {decision.earnedPoints == null
                  ? 'Automatic award retained/restored.'
                  : `Instructor award: ${decision.earnedPoints} / ${automatic?.maxPoints} points.`}
              </p>
              {decision.earnedPoints != null && automatic && (
                <p>
                  Original automatic award:{' '}
                  {automatic.status === 'needs_review'
                    ? 'Needs instructor review'
                    : `${automatic.earnedPoints} / ${automatic.maxPoints} points`}
                  .
                </p>
              )}
              {decision.comment && <p className="instructor-comment">{decision.comment}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
