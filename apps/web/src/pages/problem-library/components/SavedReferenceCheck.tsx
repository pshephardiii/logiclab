import { useState } from 'react';
import type { DerivationReferenceCheckResponse } from '@logiclab/contracts/derivation';
import type { LibraryProblemDraft } from '@logiclab/contracts/problem-library';
import * as api from '../../../api/problems/api';
import { useResourceApi } from '../../../api/ResourceApiProvider';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';

/** Mount per saved draft snapshot so selection/save changes cancel and discard older reports. */
export function SavedReferenceCheck({ problem }: { problem: LibraryProblemDraft }) {
  const { checkReference } = useResourceApi(api);
  const request = useAbortableRequest();
  const [result, setResult] = useState<DerivationReferenceCheckResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function check() {
    const signal = request.startRequest();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const value = await checkReference(problem.id, signal);
      if (signal.aborted) return;
      if (value.problemId !== problem.id || value.updatedAt !== problem.updatedAt) {
        setError('The saved draft changed. Reload problems and reopen it before checking again.');
      } else setResult(value);
    } catch (caught) {
      if (!signal.aborted)
        setError(caught instanceof Error ? caught.message : 'Could not check the saved reference.');
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  const report = result?.check.status === 'checked' ? result.check.report : null;
  return (
    <section aria-label="Saved reference check" aria-busy={busy}>
      <button disabled={busy} onClick={() => void check()}>
        {busy ? 'Checking…' : 'Check saved reference'}
      </button>
      <p className="help">
        Checks the saved statement and permitted rules. Publication always checks again.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {result && (
        <p role="status">
          {result.check.status === 'missing'
            ? 'No reference proof saved.'
            : report?.status === 'accepted'
              ? 'Reference accepted.'
              : report?.status === 'needs_review'
                ? 'Reference needs correction before publication.'
                : 'Reference could not be fully assessed.'}
        </p>
      )}
      {report && report.diagnostics.length > 0 && (
        <ul>
          {report.diagnostics.map((diagnostic, index) => (
            <li key={index}>
              {diagnostic.stepIndex !== undefined && `Line ${diagnostic.stepIndex + 1}: `}
              {diagnostic.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
