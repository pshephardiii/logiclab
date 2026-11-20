import { TRUTH_TREE_LIMITS, type TruthTreeOccurrence } from '@logiclab/contracts/truth-tree';
import { ProofFormulaInput } from '../../proof/components/ProofFormulaInput';
import { proofNotation } from '../../proof/helpers/proof-notation';

export function TruthTreeFormula({
  occurrence,
  number,
  source,
  disabled,
  onFormula,
}: {
  occurrence: TruthTreeOccurrence;
  number: number;
  source: string;
  disabled: boolean;
  onFormula?: (id: string, formula: string) => void;
}) {
  return (
    <>
      <div className="truth-tree-formula-line">
        <span className="truth-tree-formula-number">{number}.</span>
        {onFormula && occurrence.origin.kind === 'expansion' ? (
          <ProofFormulaInput
            aria-label={`Formula ${number}`}
            value={occurrence.formula}
            maxLength={TRUTH_TREE_LIMITS.maxFormulaLength}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={disabled}
            onValueChange={(formula) => onFormula(occurrence.id, formula)}
          />
        ) : (
          <code>{proofNotation(occurrence.formula) || '(blank)'}</code>
        )}
      </div>
      <small>{source}</small>
    </>
  );
}
