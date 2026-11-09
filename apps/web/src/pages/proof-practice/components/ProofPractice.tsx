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
  const [entryPending, setEntryPending] = useState(false);
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
        <p>Choose your premises and conclusion.</p>
      </header>
      <p className="help">Work is temporary; reloading clears this practice session.</p>
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
            Changing format or starting over clears this practice session after confirmation.
          </p>
          <button type="button" className="secondary" onClick={() => restart(statement.format)}>
            Start over
          </button>
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
          <PracticeProofEditor
            statement={statement}
            proof={proof}
            onChange={changeProof}
            onPendingChange={setEntryPending}
          />
          <button
            type="button"
            disabled={!proof || entryPending}
            onClick={() =>
              proof && !entryPending && setReport(checkPracticeProof(statement, proof))
            }
          >
            Check proof
          </button>
          {report && !entryPending && (
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
