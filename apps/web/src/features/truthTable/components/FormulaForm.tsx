import type { Ref } from 'react';

type Props = {
  formula: string;
  loading: boolean;
  error: string | null;
  inputRef: Ref<HTMLInputElement>;
  onFormulaChange: (value: string) => void;
  onCreate: () => Promise<void>;
};

export function FormulaForm({ formula, loading, error, inputRef, onFormulaChange, onCreate }: Props) {
  return (
    <section className="panel" aria-labelledby="formula-heading">
      <h2 id="formula-heading">Choose a formula</h2>
      <form onSubmit={event => { event.preventDefault(); void onCreate(); }}>
        <label htmlFor="formula">Propositional formula</label>
        <div className="form-row">
          <input ref={inputRef} id="formula" name="formula" value={formula}
            onChange={event => onFormulaChange(event.target.value)} required maxLength={256}
            autoComplete="off" spellCheck={false} aria-invalid={Boolean(error)}
            aria-describedby={error ? 'formula-help formula-error' : 'formula-help'} />
          <button type="submit" disabled={loading || formula.trim().length === 0}>{loading ? 'Creating…' : 'Create table'}</button>
        </div>
        <p id="formula-help" className="help">Use up to four uppercase variables. Operators: ¬ or !, ∧ or &amp;, ∨ or |, → or -&gt;. Parentheses control grouping. Editing the formula clears the current table and answers.</p>
        {error && <p id="formula-error" className="error" role="alert">{error}</p>}
      </form>
    </section>
  );
}
