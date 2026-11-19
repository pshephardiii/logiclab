import { useState } from 'react';
import type { TruthTreeCheckReport } from '@logiclab/contracts/truth-tree';
import {
  truthTreeDefinitionSchema,
  type TruthTreeDefinition,
} from '@logiclab/contracts/truth-tree-authoring';
import { checkTruthTree, isFinishedTruthTreeAttempt } from '@logiclab/logic-engine/truth-tree';
import { TruthTreeFeedback } from '../../../features/truth-tree/components/TruthTreeFeedback';

/** A local check is tied to the exact unsaved statement/reference, never publication authority. */
export function LocalTruthTreeCheck({
  definition,
  disabled,
}: {
  definition: TruthTreeDefinition;
  disabled: boolean;
}) {
  const snapshot = JSON.stringify(definition);
  const [checked, setChecked] = useState<{
    snapshot: string;
    report?: TruthTreeCheckReport;
    finished?: boolean;
    error?: string;
  } | null>(null);
  const current = !disabled && checked?.snapshot === snapshot ? checked : null;

  function check() {
    if (disabled) return;
    const parsed = truthTreeDefinitionSchema.safeParse(definition);
    if (!parsed.success || !parsed.data.referenceTree) {
      setChecked({ snapshot, error: 'Start a reference tree before checking.' });
      return;
    }
    const input = {
      problem: {
        ruleCatalogVersion: parsed.data.ruleCatalogVersion,
        premises: parsed.data.premises,
        conclusion: parsed.data.conclusion,
      },
      tree: parsed.data.referenceTree,
    };
    setChecked({
      snapshot,
      report: checkTruthTree(input),
      finished: isFinishedTruthTreeAttempt(input),
    });
  }

  return (
    <section aria-label="Check current reference">
      <button type="button" disabled={disabled} onClick={check}>
        Check current tree
      </button>
      <p className="help">
        Checks unsaved work. Save your draft before publishing; publication checks the saved
        reference independently.
      </p>
      {current?.error && (
        <p role="alert" className="error">
          {current.error}
        </p>
      )}
      {current?.report && (
        <>
          <TruthTreeFeedback report={current.report} />
          {current.report.status === 'verified' && !current.finished && (
            <p>
              Verified counterexample. Finish every remaining path to use this reference for
              completion-only work.
            </p>
          )}
        </>
      )}
    </section>
  );
}
