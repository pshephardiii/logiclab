import { ProofFormulaInput } from '../components/ProofFormulaInput';
import { PROOF_LIMITS, type TreeProof, type TreeProofNode } from '@logiclab/contracts';
import { ProofChoice } from '../components/ProofChoice';
import { TreeInferenceFields } from './TreeInferenceFields';
import { useId } from 'react';
import { ProofFormulaHint } from '../reference/ProofKeyboardGuide';

export function TreeProofNodeFields({
  proof,
  index,
  statement,
  onChange,
  onDelete,
}: {
  proof: TreeProof;
  index: number;
  statement: {
    premises: { id: string; formula: string }[];
    rules: { id: string; label: string }[];
  };
  onChange: (node: TreeProofNode) => void;
  onDelete: () => void;
}) {
  const node = proof.nodes[index]!;
  const formulaHint = useId();

  const premise =
    node.kind === 'premise'
      ? statement.premises.find((value) => value.id === node.premiseId)
      : undefined;

  return (
    <section className="problem-option" aria-label={`Proof node ${index + 1}`}>
      <h4>
        Node {index + 1} — {node.kind}
        {proof.rootId === node.id ? ' (conclusion root)' : ''}
      </h4>
      <label>
        Formula for node {index + 1}
        <ProofFormulaInput
          maxLength={PROOF_LIMITS.maxFormulaLength}
          aria-describedby={formulaHint}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={node.formula}
          onValueChange={(formula) => onChange({ ...node, formula })}
        />
      </label>
      <ProofFormulaHint id={formulaHint} />
      {node.kind === 'premise' && (
        <>
          <ProofChoice
            label={`Statement premise for node ${index + 1}`}
            value={node.premiseId}
            choices={statement.premises.map((premise, index) => ({
              id: premise.id,
              label: `${index + 1}. ${premise.formula || '(blank)'}`,
            }))}
            onChange={(premiseId) => onChange({ ...node, premiseId })}
          />
          <button
            type="button"
            className="secondary"
            disabled={!premise}
            onClick={() => {
              if (premise) onChange({ ...node, formula: premise.formula });
            }}
          >
            Copy statement premise to node {index + 1}
          </button>
        </>
      )}
      {node.kind === 'inference' && (
        <TreeInferenceFields
          proof={proof}
          node={node}
          index={index}
          rules={statement.rules}
          onChange={onChange}
        />
      )}
      <button type="button" className="secondary" onClick={onDelete}>
        Delete node {index + 1}
      </button>
    </section>
  );
}
