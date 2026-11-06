import type { TreeProof, TreeProofNode, TreeProofBranch } from '@logiclab/contracts';
import { PROOF_LIMITS } from '@logiclab/contracts';
import { getPropositionalRule } from '@logiclab/logic-engine/proof/rules';
import { ProofChoice } from '../components/ProofChoice';
import { treeNodeChoices } from './editor';

type Inference = Extract<TreeProofNode, { kind: 'inference' }>;
export function TreeInferenceFields({
  proof,
  node,
  index,
  rules,
  onChange,
}: {
  proof: TreeProof;
  node: Inference;
  index: number;
  rules: { id: string; label: string }[];
  onChange: (node: Inference) => void;
}) {
  const rule = node.ruleId ? getPropositionalRule(node.ruleId) : undefined;
  const choices = treeNodeChoices(proof).filter((choice) => choice.id !== node.id);
  const assumptions = choices.filter(
    (choice) => proof.nodes.find((node) => node.id === choice.id)?.kind === 'assumption',
  );
  return (
    <>
      <ProofChoice
        label={`Rule for node ${index + 1}`}
        value={node.ruleId}
        choices={rules}
        onChange={(ruleId) => onChange({ ...node, ruleId })}
      />
      {Array.from(
        { length: Math.max(rule?.lineReferences ?? 0, node.lineReferences.length) },
        (_, slot) => (
          <ProofChoice
            key={`child-${slot}`}
            label={`Node ${index + 1} supporting node ${slot + 1}`}
            value={node.lineReferences[slot] ?? null}
            choices={choices}
            onChange={(id) => {
              const refs = [...node.lineReferences];
              if (id) refs[slot] = id;
              else refs.splice(slot, 1);
              onChange({ ...node, lineReferences: refs.filter(Boolean) });
            }}
          />
        ),
      )}
      {Array.from(
        { length: Math.max(rule?.subproofReferences ?? 0, node.branches.length) },
        (_, slot) => {
          const branch = node.branches[slot] ?? {
            rootId: null,
            assumptionFormula: '',
            assumptionIds: [],
          };
          function change(patch: Partial<TreeProofBranch>) {
            const branches = [...node.branches];
            while (branches.length <= slot)
              branches.push({ rootId: null, assumptionFormula: '', assumptionIds: [] });
            branches[slot] = { ...branch, ...patch };
            onChange({ ...node, branches });
          }
          const unavailable = branch.assumptionIds.filter(
            (id) => !assumptions.some((choice) => choice.id === id),
          );
          return (
            <fieldset key={`branch-${slot}`} className="tree-branch">
              <legend>
                Node {index + 1} discharged branch {slot + 1}
              </legend>
              <ProofChoice
                label={`Node ${index + 1} branch ${slot + 1} root`}
                value={branch.rootId}
                choices={choices}
                onChange={(rootId) => change({ rootId })}
              />
              <label>
                Node {index + 1} branch {slot + 1} assumption formula
                <input
                  maxLength={PROOF_LIMITS.maxFormulaLength}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={branch.assumptionFormula}
                  onChange={(event) => change({ assumptionFormula: event.target.value })}
                />
              </label>
              <p className="help">
                Select the assumption occurrences this branch discharges. None means vacuous
                discharge. Checking verifies that selected leaves are open in this subtree and match
                the assumption formula.
              </p>
              {assumptions.map((choice) => (
                <label key={choice.id} className="tree-assumption-choice">
                  <input
                    type="checkbox"
                    checked={branch.assumptionIds.includes(choice.id)}
                    disabled={
                      !branch.assumptionIds.includes(choice.id) &&
                      branch.assumptionIds.length >= PROOF_LIMITS.maxSteps
                    }
                    onChange={(event) =>
                      change({
                        assumptionIds: event.target.checked
                          ? [...branch.assumptionIds, choice.id]
                          : branch.assumptionIds.filter((id) => id !== choice.id),
                      })
                    }
                  />
                  Discharge node {choice.label}
                </label>
              ))}
              {unavailable.map((id, position) => (
                <div key={position}>
                  Missing assumption occurrence
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      change({
                        assumptionIds: branch.assumptionIds.filter((value) => value !== id),
                      })
                    }
                  >
                    Remove unavailable assumption {position + 1} from node {index + 1} branch{' '}
                    {slot + 1}
                  </button>
                </div>
              ))}
              {slot < node.branches.length && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    onChange({
                      ...node,
                      branches: node.branches.filter((_, index) => index !== slot),
                    })
                  }
                >
                  Remove node {index + 1} branch {slot + 1}
                </button>
              )}
            </fieldset>
          );
        },
      )}
    </>
  );
}
