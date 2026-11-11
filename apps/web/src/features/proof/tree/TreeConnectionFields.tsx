import type { TreeProof } from '@logiclab/contracts';
import { PROOF_LIMITS } from '@logiclab/contracts';
import { ProofFormulaInput } from '../components/ProofFormulaInput';
import { proofNotation } from '../helpers/proof-notation';
import type { TreeConnection } from './entry';

/** Connection metadata is explicit; selecting a branch never infers which assumptions discharge. */
export function TreeConnectionFields({
  connection,
  proof,
  onChange,
}: {
  connection: TreeConnection;
  proof: TreeProof;
  onChange: (connection: TreeConnection) => void;
}) {
  const parent = proof.nodes.findIndex((node) => node.id === connection.parentId);
  return (
    <section className="tree-connection" aria-label="New node connection">
      <h4>Connect to node {parent + 1}</h4>
      <p>
        {connection.kind === 'support' ? 'Supporting node' : 'Discharged branch'}{' '}
        {connection.slot + 1}
      </p>
      {connection.kind === 'branch' && (
        <>
          <label>
            Branch assumption formula
            <ProofFormulaInput
              value={connection.assumptionFormula}
              onValueChange={(assumptionFormula) => onChange({ ...connection, assumptionFormula })}
              maxLength={PROOF_LIMITS.maxFormulaLength}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </label>
          <fieldset>
            <legend>Assumptions to discharge</legend>
            {proof.nodes.map(
              (node, index) =>
                node.kind === 'assumption' && (
                  <label className="tree-assumption-choice" key={node.id}>
                    <input
                      type="checkbox"
                      checked={connection.assumptionIds.includes(node.id)}
                      onChange={(event) =>
                        onChange({
                          ...connection,
                          assumptionIds: event.target.checked
                            ? [...connection.assumptionIds, node.id]
                            : connection.assumptionIds.filter((id) => id !== node.id),
                        })
                      }
                    />
                    Discharge node {index + 1}: {proofNotation(node.formula) || '(blank)'}
                  </label>
                ),
            )}
          </fieldset>
        </>
      )}
    </section>
  );
}
