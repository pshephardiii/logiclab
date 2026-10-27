import { useEffect, useState } from 'react';
import { FormulaParseError, parseFormula } from '@logiclab/logic-engine';

export const FORMULA_VALIDATION_DELAY_MS = 500;

/** Checks syntax locally after typing pauses; never creates a table or sends a request. */
export function useFormulaValidation(formula: string) {
  const [result, setResult] = useState<{
    formula: string;
    valid: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!formula.trim()) return;
    const timer = setTimeout(() => {
      try {
        parseFormula(formula);
        setResult({
          formula,
          valid: true,
          message: 'Formula is well formed. Ready to create a table.',
        });
      } catch (error) {
        if (!(error instanceof FormulaParseError)) throw error;
        setResult({ formula, valid: false, message: error.message });
      }
    }, FORMULA_VALIDATION_DELAY_MS);
    return () => clearTimeout(timer);
  }, [formula]);

  // Do not show a previous formula's verdict while waiting for the new debounce.
  return result?.formula === formula && formula.trim() ? result : null;
}
