import type { SavedStudentAssignment } from '@logiclab/contracts/saved-student-work';

type Props = {
  items: Pick<SavedStudentAssignment['items'][number], 'id' | 'title'>[];
  selectedId: string;
  position: number;
  busy: boolean;
  maxPoints?: number;
  onSelect: (position: number) => void;
};

/** The parent handles selection state, check cancellation and confirmation resets. */
export function AssignedProblemNavigation({
  items,
  selectedId,
  position,
  busy,
  maxPoints,
  onSelect,
}: Props) {
  return (
    <section className="panel">
      {maxPoints != null && <p>This problem: {maxPoints} points.</p>}
      <label htmlFor="assigned-item">Problem</label>
      <select
        className="assignment-choice"
        id="assigned-item"
        value={selectedId}
        disabled={busy}
        onChange={(event) => onSelect(items.findIndex((value) => value.id === event.target.value))}
      >
        {items.map((value, index) => (
          <option key={value.id} value={value.id}>
            {index + 1}. {value.title}
          </option>
        ))}
      </select>
      <div className="action-row">
        <button
          className="secondary"
          disabled={busy || position === 0}
          onClick={() => onSelect(position - 1)}
        >
          Previous problem
        </button>
        <button
          className="secondary"
          disabled={busy || position >= items.length - 1}
          onClick={() => onSelect(position + 1)}
        >
          Next problem
        </button>
      </div>
    </section>
  );
}
