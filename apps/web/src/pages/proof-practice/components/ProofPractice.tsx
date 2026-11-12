import { useState } from 'react';
import type { ProofCheckReport } from '@logiclab/contracts';
import { ProofFeedback } from '../../../features/proof/components/ProofFeedback';
import { useUnsavedWork } from '../../../features/unsaved-work/hooks/useUnsavedWork';
import { useConfirmDiscard } from '../../../features/unsaved-work/hooks/useConfirmDiscard';
import { PracticeConclusionEditor } from './PracticeConclusionEditor';
import { PracticeProofEditor } from './PracticeProofEditor';
import { ProofPracticeSetup } from './ProofPracticeSetup';
import {
  checkPracticeProof,
  type PracticeStatement,
  type PracticeProof,
} from '../helpers/practice-proof';
import '../../../features/proof/proof.css';
import { startPracticeProof } from '../helpers/start-practice-proof';
import '../proof-practice.css';

/** Self-created practice belongs to this page session, independently from saved classroom work. */
export function ProofPractice() {
  const confirmDiscard = useConfirmDiscard();
  const [setupFormat, setSetupFormat] = useState<PracticeStatement['format']>('fitch');
  const [statement, setStatement] = useState<PracticeStatement | null>(null);
  const [proof, setProof] = useState<PracticeProof | null>(null);
  const [report, setReport] = useState<ProofCheckReport | null>(null);
  const [entryPending, setEntryPending] = useState(false);
  const [conclusionEditing, setConclusionEditing] = useState(false);
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

  const checkAction = (
    <button
      type="button"
      disabled={!proof || entryPending || conclusionEditing}
      onClick={() =>
        proof &&
        !entryPending &&
        !conclusionEditing &&
        setReport(checkPracticeProof(statement!, proof))
      }
    >
      Check proof
    </button>
  );

  return (
    <div className="proof-practice">
      <header>
        <p className="eyebrow">LogicLab / Independent practice</p>
        <h1>Practice a derivation.</h1>
        {!statement && <p>Choose your premises and conclusion.</p>}
      </header>
      {!statement ? (
        <ProofPracticeSetup
          initialFormat={setupFormat}
          onStart={(next) => {
            setStatement(next);
            setProof(startPracticeProof(next));
            setReport(null);
          }}
        />
      ) : (
        <section className="panel proof-editor practice-workspace">
          <div className="practice-workspace-tools">
            <div>
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
            </div>
            <p id="practice-reset-description" className="proof-control-label">
              Changing format or starting over clears this practice session after confirmation.
            </p>
            <button type="button" className="secondary" onClick={() => restart(statement.format)}>
              Start over
            </button>
          </div>
          <PracticeProofEditor
            statement={statement}
            proof={proof}
            onChange={changeProof}
            onPremiseChange={(premiseId, formula) => {
              setStatement((current) =>
                current && current.format !== 'tree'
                  ? {
                      ...current,
                      premises: current.premises.map((premise) =>
                        premise.id === premiseId ? { ...premise, formula } : premise,
                      ),
                    }
                  : current,
              );
              setReport(null);
            }}
            onPendingChange={setEntryPending}
            actions={statement.format !== 'tree' ? checkAction : undefined}
            conclusionActions={
              statement.format !== 'tree' ? (
                <PracticeConclusionEditor
                  conclusion={statement.conclusion}
                  onEditingChange={setConclusionEditing}
                  onApply={(conclusion) => {
                    setStatement({ ...statement, conclusion });
                    setReport(null);
                  }}
                />
              ) : undefined
            }
          />
          {statement.format === 'tree' && (
            <div className="practice-check-actions">{checkAction}</div>
          )}
          {report && !entryPending && !conclusionEditing && (
            <ProofFeedback
              report={report}
              stepLabel={statement.format === 'tree' ? 'Node' : 'Line'}
            />
          )}
        </section>
      )}
      <p className="help practice-session-note">
        Work is temporary; reloading clears this practice session.
      </p>
    </div>
  );
}
