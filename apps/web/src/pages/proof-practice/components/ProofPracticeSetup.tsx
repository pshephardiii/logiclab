import { useState, type FormEvent } from 'react';
import { PROOF_LIMITS } from '@logiclab/contracts';
import { PROPOSITIONAL_RULE_CATALOG } from '@logiclab/logic-engine/proof/rules';
import { useUnsavedWork } from '../../../features/unsaved-work/hooks/useUnsavedWork';
import { practiceStatement, type PracticeStatement } from '../helpers/practice-proof';

const formulaInput = {
  maxLength: PROOF_LIMITS.maxFormulaLength,
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
} as const;

/** Setup is page-local; only a syntactically valid statement becomes an active practice session. */
export function ProofPracticeSetup({
  onStart,
}: {
  onStart: (statement: PracticeStatement) => void;
}) {
  const [format, setFormat] = useState<PracticeStatement['format']>('fitch');
  const [premises, setPremises] = useState<PracticeStatement['premises']>([]);
  const [conclusion, setConclusion] = useState('');
  const [ruleIds, setRuleIds] = useState<string[]>(
    PROPOSITIONAL_RULE_CATALOG.map((rule) => rule.id),
  );
  const [error, setError] = useState<string | null>(null);
  useUnsavedWork(
    format !== 'fitch' ||
      premises.length > 0 ||
      conclusion.length > 0 ||
      ruleIds.length !== PROPOSITIONAL_RULE_CATALOG.length,
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      onStart(practiceStatement(format, premises, conclusion, ruleIds));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Check the practice setup.');
    }
  }

  return (
    <form className="panel proof-editor" aria-label="Proof practice setup" onSubmit={submit}>
      <h2>Choose your proof problem</h2>
      <label htmlFor="practice-proof-format">Proof format</label>
      <select
        id="practice-proof-format"
        value={format}
        onChange={(event) => setFormat(event.target.value as PracticeStatement['format'])}
      >
        <option value="fitch">Fitch</option>
        <option value="dependency">Dependency</option>
        <option value="tree">Natural-deduction tree</option>
      </select>
      <p className="help">
        Choose the format before starting. Instructor-assigned problems keep their instructor's
        format.
      </p>
      <h3>Premises</h3>
      <p className="help">Premises are optional. Use none when practicing a theorem.</p>
      {premises.map((premise, index) => (
        <div key={premise.id}>
          <label htmlFor={`practice-premise-${premise.id}`}>Premise {index + 1}</label>
          <input
            {...formulaInput}
            id={`practice-premise-${premise.id}`}
            required
            value={premise.formula}
            onChange={(event) =>
              setPremises(
                premises.map((value) =>
                  value.id === premise.id ? { ...value, formula: event.target.value } : value,
                ),
              )
            }
          />
          <button
            type="button"
            className="secondary"
            onClick={() => setPremises(premises.filter((value) => value.id !== premise.id))}
          >
            Remove premise {index + 1}
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={premises.length >= PROOF_LIMITS.maxPremises}
        onClick={() => setPremises([...premises, { id: crypto.randomUUID(), formula: '' }])}
      >
        Add premise
      </button>
      <label htmlFor="practice-proof-conclusion">Conclusion</label>
      <input
        {...formulaInput}
        id="practice-proof-conclusion"
        required
        value={conclusion}
        onChange={(event) => setConclusion(event.target.value)}
      />
      <p className="help">
        Use A–Z, ! or ~, &amp;, v or |, -&gt;, &lt;-&gt;, parentheses or square brackets.
        Contradiction: ⊥ or _|_.
      </p>
      <details>
        <summary>Permitted rules ({ruleIds.length} selected)</summary>
        <p className="help">
          All supported rules start enabled, including classical rules. Disable any rules you do not
          want to practice with.
        </p>
        {PROPOSITIONAL_RULE_CATALOG.map((rule) => (
          <label key={rule.id} className="dependency-source">
            <input
              type="checkbox"
              checked={ruleIds.includes(rule.id)}
              onChange={(event) =>
                setRuleIds(
                  event.target.checked
                    ? [...ruleIds, rule.id]
                    : ruleIds.filter((id) => id !== rule.id),
                )
              }
            />
            {rule.label}
            {rule.category === 'classical' ? ' (classical)' : ''}
          </label>
        ))}
      </details>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button type="submit">Begin proof practice</button>
    </form>
  );
}
