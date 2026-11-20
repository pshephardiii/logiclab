import { TRUTH_TREE_LIMITS, type TruthTreeOccurrence } from '@logiclab/contracts/truth-tree';
import { ProofFormulaInput } from '../../proof/components/ProofFormulaInput';
import { truthTreeFormulaLabel, type FormulaProgress } from '../helpers/formula-presentation';

const markers = {
  applied: ['✓', 'Rule applied on all paths'],
  partial: ['◐', 'Rule applied on some paths'],
  literal: ['•', 'Literal: no decomposition needed'],
  constant: ['•', 'Constant: no decomposition needed'],
  pending: ['○', 'Not yet decomposed'],
  invalid: ['?', 'Formula cannot be parsed'],
} as const;

export function TruthTreeFormula({
  occurrence,
  progress,
  number,
  source,
  disabled,
  onFormula,
}: {
  occurrence: TruthTreeOccurrence;
  progress?: FormulaProgress;
  number: number;
  source: string;
  disabled: boolean;
  onFormula?: (id: string, formula: string) => void;
}) {
  return (
    <>
      <div className="truth-tree-formula-line">
        {progress && (
          <span
            className={`truth-tree-formula-marker truth-tree-formula-marker--${progress}`}
            role="img"
            aria-label={markers[progress][1]}
            title={markers[progress][1]}
          >
            {markers[progress][0]}
          </span>
        )}
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
          <code>{truthTreeFormulaLabel(occurrence.formula)}</code>
        )}
      </div>
      <small>{source}</small>
    </>
  );
}
