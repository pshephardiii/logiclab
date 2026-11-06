import { useState } from 'react';
import type { SubmissionGradingHistoryEntry } from '@logiclab/contracts';
import { useResourceApi } from '../../../api/ResourceApiProvider';
import * as reviewApi from '../../../api/submission-review/api';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';
import { appendPageById } from '../../../helpers/append-page-by-id';

/** Owner-only retained changes; a new saved revision remounts this bounded history view. */
export function SubmissionGradingHistory({
  assignmentId,
  submissionId,
  items,
}: {
  assignmentId: string;
  submissionId: string;
  items: readonly { id: string; title: string }[];
}) {
  const { readGradingHistory } = useResourceApi(reviewApi);
  const requests = useAbortableRequest();
  const [entries, setEntries] = useState<SubmissionGradingHistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [next, setNext] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(offset = 0) {
    const signal = requests.startRequest();

    setBusy(true);
    setError(null);

    try {
      const page = await readGradingHistory(assignmentId, submissionId, offset, signal);

      if (!signal.aborted) {
        setEntries((previous) =>
          offset ? appendPageById(previous, page.revisions) : page.revisions,
        );
        setNext(page.nextOffset);
        setLoaded(true);
      }
    } catch (caught) {
      if (!signal.aborted)
        setError(caught instanceof Error ? caught.message : 'Could not load history.');
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }

  return (
    <section aria-label="Grading history">
      <h3>Grading history</h3>
      <button type="button" className="secondary" disabled={busy} onClick={() => void load()}>
        {loaded ? 'Reload grading history' : 'Load grading history'}
      </button>
      {busy && <p role="status">Loading grading history…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {loaded && !entries.length && <p>No instructor adjustments yet.</p>}
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <p>
              <strong>Revision {entry.grading.revision}</strong> ·{' '}
              {new Date(entry.reviewedAt).toLocaleString()} · Reviewer {entry.reviewedBy}
            </p>
            <p>
              {entry.score.summary.status === 'needs_review'
                ? 'Assignment still needs instructor review.'
                : `Assignment: ${entry.score.summary.earnedPoints} / ${entry.score.summary.maxPoints} points`}
            </p>
            <ul>
              {entry.changes.map((change) => {
                const position = items.findIndex((item) => item.id === change.itemId);

                return (
                  <li key={change.itemId}>
                    Problem {position + 1}: {items[position]?.title ?? change.itemId} —{' '}
                    {change.earnedPoints == null
                      ? 'Automatic award restored/retained'
                      : `${change.earnedPoints} points`}
                    <p className="instructor-comment">{change.comment ?? 'No comment.'}</p>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      {next !== null && (
        <button type="button" disabled={busy} onClick={() => void load(next)}>
          Load more grading history
        </button>
      )}
    </section>
  );
}
