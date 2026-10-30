import { ASSIGNMENT_POINT_LIMITS, type PublishedProblemVersion } from '@logiclab/contracts';

export type SelectedProblem = { key: string; maxPoints?: number; version: PublishedProblemVersion };
type Props = {
  items: SelectedProblem[];
  readOnly: boolean;
  graded: boolean;
  onPoints: (index: number, points: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
};

/** Keeps repeated publications distinct while exposing explicit, keyboard-accessible ordering controls. */
export function AssignmentItems({ items, readOnly, graded, onPoints, onMove, onRemove }: Props) {
  return (
    <section aria-label="Selected assignment problems">
      <h3>Ordered problems ({items.length}/50)</h3>
      {!items.length && (
        <p>
          No problems selected. Use Add published problems below to build this list. Empty drafts
          can be saved.
        </p>
      )}
      <ol className="assignment-items">
        {items.map((item, index) => (
          <li key={item.key}>
            <h4>
              {item.version.title} · version {item.version.version}
            </h4>
            <p>{item.version.instructions || 'No problem instructions.'}</p>
            <code>
              {item.version.definition.type === 'truth_table'
                ? item.version.definition.formula
                : item.version.definition.question}
            </code>
            {graded && (
              <label>
                Points for problem {index + 1}
                <input
                  type="number"
                  required
                  min={ASSIGNMENT_POINT_LIMITS.minPoints}
                  max={ASSIGNMENT_POINT_LIMITS.maxPoints}
                  step={1}
                  disabled={readOnly}
                  value={
                    Number.isNaN(item.maxPoints)
                      ? ''
                      : (item.maxPoints ?? ASSIGNMENT_POINT_LIMITS.defaultPoints)
                  }
                  onChange={(event) => onPoints(index, event.target.valueAsNumber)}
                />
              </label>
            )}
            {!readOnly && (
              <div className="action-row">
                <button
                  type="button"
                  disabled={index === 0}
                  aria-label={`Move problem ${index + 1} up`}
                  onClick={() => onMove(index, -1)}
                >
                  Move up
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  aria-label={`Move problem ${index + 1} down`}
                  onClick={() => onMove(index, 1)}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className="secondary"
                  aria-label={`Remove problem ${index + 1}`}
                  onClick={() => onRemove(index)}
                >
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
