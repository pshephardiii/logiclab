import { useState } from 'react';
import {
  derivationDefinitionSchema,
  type DerivationDefinition,
} from '@logiclab/contracts/derivation';
import type { ProofCheckReport } from '@logiclab/contracts';
import { checkProof } from '@logiclab/logic-engine/proof';

/** A local report is only valid for the exact unsaved definition that was explicitly checked. */
export function LocalReferenceCheck({ definition }: { definition: DerivationDefinition }) {
  const snapshot = JSON.stringify(definition);
  const [checked, setChecked] = useState<{
    snapshot: string;
    report?: ProofCheckReport;
    error?: string;
  } | null>(null);
  const current = checked?.snapshot === snapshot ? checked : null;
  function check() {
    const parsed = derivationDefinitionSchema.safeParse(definition);
    if (!parsed.success) {
      setChecked({
        snapshot,
        error: parsed.error.issues
          .slice(0, 3)
          .map((issue) => issue.message)
          .join(' '),
      });
      return;
    }
    const value = parsed.data;
    if (!value.referenceProof) {
      setChecked({ snapshot, error: 'Start a reference proof before checking.' });
      return;
    }
    setChecked({
      snapshot,
      report: checkProof({
        problem: {
          ruleCatalogVersion: value.ruleCatalogVersion,
          premises: value.premises,
          conclusion: value.conclusion,
          permittedRuleIds: value.rules.map((rule) => rule.id),
        },
        proof: value.referenceProof,
      }),
    });
  }
  return (
    <section aria-label="Check current reference">
      <button type="button" onClick={check}>
        Check current proof
      </button>
      <p className="help">
        Checks local unsaved work without saving. Publication independently checks the saved draft
        on the server.
      </p>
      {current?.error && (
        <p role="alert" className="error">
          {current.error}
        </p>
      )}
      {current?.report && (
        <>
          <p role="status">
            {current.report.status === 'accepted'
              ? 'Current reference accepted. Save it before publishing.'
              : current.report.status === 'needs_review'
                ? 'Current reference needs correction.'
                : 'Current reference could not be fully assessed.'}
          </p>
          <ul>
            {current.report.diagnostics.map((diagnostic, index) => (
              <li key={index}>
                {diagnostic.stepIndex !== undefined && `Line ${diagnostic.stepIndex + 1}: `}
                {diagnostic.message}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
