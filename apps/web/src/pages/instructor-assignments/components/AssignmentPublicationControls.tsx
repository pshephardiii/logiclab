import { isProblemMethodAvailable } from '../../../features/proof/helpers/method-availability';
import type { AssignmentDetail } from '@logiclab/contracts';

type Props = {
  assignment: Pick<AssignmentDetail, 'publishedAt' | 'archivedAt' | 'items'>;
  dirty: boolean;
  busy: boolean;
  onDuplicate: () => void;
  onPublish: () => void;
  onToggleArchive: () => void;
  onReload: () => void;
};

export function AssignmentPublicationControls({
  assignment,
  dirty,
  busy,
  onDuplicate,
  onPublish,
  onToggleArchive,
  onReload,
}: Props) {
  const unavailable = assignment.items.some(
    (item) => !isProblemMethodAvailable(item.problemVersion.definition),
  );
  return (
    <section className="panel" aria-label="Assignment publication">
      <h2>Publication and archive</h2>
      {assignment.publishedAt && (
        <p>Published {new Date(assignment.publishedAt).toLocaleString()}</p>
      )}
      {!assignment.publishedAt && !unavailable && (
        <p>
          Publish the saved draft to lock its problem order and policy. At least one problem is
          required.
        </p>
      )}
      <p className="help">
        {unavailable
          ? 'Retained work is read-only. Archive, release and historical review are still available.'
          : 'Published, active assignments are available to enrolled students.'}
      </p>
      {!unavailable && (
        <p className="help">
          Duplicate as draft copies saved content into this class and opens a new editable draft.
          Unsaved edits are not copied; the source is unchanged.
        </p>
      )}
      <div className="action-row">
        <button className="secondary" disabled={unavailable || busy} onClick={onDuplicate}>
          Duplicate as draft
        </button>
        {!assignment.publishedAt && !unavailable && (
          <button
            disabled={dirty || busy || Boolean(assignment.archivedAt) || !assignment.items.length}
            onClick={onPublish}
          >
            Publish assignment
          </button>
        )}
        <button className="secondary" disabled={dirty || busy} onClick={onToggleArchive}>
          {assignment.archivedAt ? 'Restore assignment' : 'Archive assignment'}
        </button>
        <button className="secondary" disabled={busy} onClick={onReload}>
          Reload saved assignment
        </button>
      </div>
    </section>
  );
}
