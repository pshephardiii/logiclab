import { useConfirmDiscard } from '../../../features/unsaved-work/hooks/useConfirmDiscard';
import { useState } from 'react';
import { useStudentAssignments } from '../hooks/useStudentAssignments';
import { AssignedAttempt } from './AssignedAttempt';

export function StudentAssignments({ classId }: { classId: string }) {
  const confirmDiscard = useConfirmDiscard();
  const list = useStudentAssignments(classId);
  const [selected, setSelected] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  function select(id: string) {
    confirmDiscard(() => {
      setSelected(id);
      setRevision((value) => value + 1);
    });
  }
  return (
    <>
      <p className="help">
        Unsaved edits are protected when you change classes, assignments, or pages. Save answers
        explicitly to keep them after a reload.
      </p>
      <section className="panel" aria-label="Available assignments">
        <h2>Published assignments</h2>
        {list.loading && <p role="status">Loading assignments…</p>}
        {list.error && (
          <p role="alert" className="error">
            {list.error}
          </p>
        )}
        {!list.loading && !list.error && !list.assignments.length && (
          <p>No published assignments for this class.</p>
        )}
        <button className="secondary" disabled={list.loading} onClick={() => void list.load()}>
          Reload available assignments
        </button>
        <ul>
          {list.assignments.map((assignment) => (
            <li key={assignment.id}>
              <button className="text-button" onClick={() => select(assignment.id)}>
                {assignment.title}
              </button>
            </li>
          ))}
        </ul>
        {list.next !== null && (
          <button disabled={list.loading} onClick={() => void list.load(list.next!)}>
            Load more assignments
          </button>
        )}
      </section>
      {selected && <AssignedAttempt key={`${selected}:${revision}`} assignmentId={selected} />}
    </>
  );
}
