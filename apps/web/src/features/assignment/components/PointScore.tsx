import type { AssignmentScore } from '@logiclab/contracts';

/** Displays only the authoritative frozen snapshot supplied by the caller. */
export function PointScore({
  score,
  items,
  showItems = true,
}: {
  score: AssignmentScore;
  items?: readonly { id: string; title: string }[];
  showItems?: boolean;
}) {
  const total = score.summary;
  return (
    <div aria-label="Point score">
      <p>
        <strong>
          {total.status === 'needs_review'
            ? `Needs instructor review · ${total.maxPoints} points available`
            : `${total.earnedPoints} / ${total.maxPoints} points (${total.percentage}%)`}
        </strong>
      </p>
      {showItems && (
        <ul>
          {score.items.map((item, index) => {
            const title = items?.find((value) => value.id === item.itemId)?.title;
            return (
              <li key={item.itemId}>
                Problem {index + 1}
                {title ? `: ${title}` : ''} —{' '}
                {item.status === 'needs_review'
                  ? `Needs instructor review · ${item.maxPoints} points available`
                  : `${item.earnedPoints} / ${item.maxPoints} points`}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
