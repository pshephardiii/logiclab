import type { Ref, FormEvent } from 'react';
import { useFormulaValidation } from '../hooks/useFormulaValidation';
import { FormulaKey } from './FormulaKey';

type Props = {
  formula: string;
  loading: boolean;
  error: string | null;
  inputRef: Ref<HTMLInputElement>;
  onFormulaChange: (value: string) => void;
  onCreate: () => Promise<void>;
};

/**
 * Collects a formula with local syntax feedback and API generation errors.
 * The practice hook owns formula state and creation requests.
 */
export function FormulaForm({
  formula,
  loading,
  error,
  inputRef,
  onFormulaChange,
  onCreate,
}: Props) {
  const validation = useFormulaValidation(formula);
  const descriptions = ['formula-help', 'formula-validation', ...(error ? ['formula-error'] : [])];
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onCreate();
  }

  return (
    <section className="panel" aria-labelledby="formula-heading">
      <h2 id="formula-heading">Choose a formula</h2>
      <div className="formula-entry-layout">
        <form onSubmit={handleSubmit}>
          <label htmlFor="formula">Propositional formula</label>
          <div className="form-row">
            <input
              ref={inputRef}
              id="formula"
              name="formula"
              value={formula}
              onChange={(event) => onFormulaChange(event.target.value)}
              required
              maxLength={256}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(error) || validation?.valid === false}
              aria-describedby={descriptions.join(' ')}
            />
            <button type="submit" disabled={loading || formula.trim().length === 0}>
              {loading ? 'Creating…' : 'Create table'}
            </button>
          </div>
          <p id="formula-help" className="help">
            Use up to four uppercase variables (A–Z). Lowercase v means OR; uppercase V is a
            variable. Parentheses control grouping. Editing the formula clears the current table and
            answers.
          </p>
          <p
            id="formula-validation"
            role="status"
            className={validation?.valid === false ? 'error' : 'help'}
          >
            {validation?.message}
          </p>
          {error && (
            <p id="formula-error" className="error" role="alert">
              {error}
            </p>
          )}
        </form>
        <FormulaKey />
      </div>
    </section>
  );
}
