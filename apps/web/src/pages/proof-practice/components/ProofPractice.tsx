import { useState } from 'react';
import type { ProofCheckReport } from '@logiclab/contracts';
import { ProofFeedback } from '../../../features/proof/components/ProofFeedback';
import { useUnsavedWork } from '../../../features/unsaved-work/hooks/useUnsavedWork';
import { useConfirmDiscard } from '../../../features/unsaved-work/hooks/useConfirmDiscard';
import { PracticeProofEditor } from './PracticeProofEditor';
import { ProofPracticeSetup } from './ProofPracticeSetup';
import {
  checkPracticeProof,
  type PracticeStatement,
  type PracticeProof,
} from '../helpers/practice-proof';
import '../../../features/proof/proof.css';

/** Self-created practice belongs to this page session, independently from saved classroom work. */
export function ProofPractice() {
  const confirmDiscard = useConfirmDiscard();
  const [setupFormat, setSetupFormat] = useState<PracticeStatement['format']>('fitch');
  const [statement, setStatement] = useState<PracticeStatement | null>(null);
  const [proof, setProof] = useState<PracticeProof | null>(null);
  const [report, setReport] = useState<ProofCheckReport | null>(null);
  useUnsavedWork(statement !== null);

  function changeProof(next: PracticeProof | null) {
    setProof(next);
    setReport(null);
  }

  function restart(format: PracticeStatement['format']) {
    confirmDiscard(() => {
      setSetupFormat(format);
      setStatement(null);
      setProof(null);
      setReport(null);
    });
  }

  return (
    <>
      <header>
        <p className="eyebrow">LogicLab / Independent practice</p>
        <h1>Practice a derivation.</h1>
        <p>
          Choose your own premises and conclusion. No reference solution or account is required.
        </p>
      </header>
      <p className="help">
        Check proof evaluates only the proof you enter. It does not search for a solution or
        establish that an unverified target is impossible under your selected rules.
      </p>
      <p className="help">
        This work stays in the current page session. It is not saved to an account or browser
        storage, and reload clears it. No grades or instructor-visible records are created.
      </p>
      {!statement ? (
        <ProofPracticeSetup initialFormat={setupFormat} onStart={setStatement} />
      ) : (
        <section className="panel proof-editor">
          <h2>Your practice problem</h2>
          <label htmlFor="active-practice-format">Change proof format</label>
          <select
            id="active-practice-format"
            value={statement.format}
            onChange={(event) => {
              const format = event.target.value as PracticeStatement['format'];

              if (format !== statement.format) restart(format);
            }}
            aria-describedby="practice-reset-description"
          >
            <option value="fitch">Fitch</option>
            <option value="dependency">Dependency</option>
            <option value="tree">Natural-deduction tree</option>
          </select>
          <p id="practice-reset-description" className="help">
            Changing format or starting over discards all premises, the conclusion, selected rules,
            proof steps/nodes, assumptions, references and feedback. Stay keeps everything. Discard
            changes opens an empty setup with the default rules; no proof is converted.
          </p>
          <button type="button" className="secondary" onClick={() => restart(statement.format)}>
            Start over
          </button>
          <p>
            <strong>Format:</strong>{' '}
            {statement.format === 'tree'
              ? 'Natural-deduction tree'
              : statement.format === 'dependency'
                ? 'Dependency'
                : 'Fitch'}
          </p>
          <h3>Premises</h3>
          {statement.premises.length ? (
            <ol>
              {statement.premises.map((premise) => (
                <li key={premise.id}>
                  <code>{premise.formula}</code>
                </li>
              ))}
            </ol>
          ) : (
            <p>No premises.</p>
          )}
          <p>
            <strong>Conclusion:</strong> <code>{statement.conclusion}</code>
          </p>
          <details>
            <summary>Permitted rules</summary>
            <ul>
              {statement.rules.map((rule) => (
                <li key={rule.id}>{rule.label}</li>
              ))}
            </ul>
            {!statement.rules.length && <p>No inference rules enabled.</p>}
          </details>
          <PracticeProofEditor statement={statement} proof={proof} onChange={changeProof} />
          <button
            type="button"
            disabled={!proof}
            onClick={() => proof && setReport(checkPracticeProof(statement, proof))}
          >
            Check proof
          </button>
          {report && (
            <ProofFeedback
              report={report}
              stepLabel={statement.format === 'tree' ? 'Node' : 'Line'}
            />
          )}
        </section>
      )}
    </>
  );
}
