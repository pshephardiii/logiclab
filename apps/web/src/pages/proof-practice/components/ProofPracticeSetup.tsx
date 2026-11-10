import { useState, type FormEvent } from 'react';
import { PROOF_LIMITS } from '@logiclab/contracts';
import { PROPOSITIONAL_RULE_CATALOG } from '@logiclab/logic-engine/proof/rules';
import { useUnsavedWork } from '../../../features/unsaved-work/hooks/useUnsavedWork';
import { useConfirmDiscard } from '../../../features/unsaved-work/hooks/useConfirmDiscard';
import { PracticeRuleDialog } from './PracticeRuleDialog';
import { ProofKeyboardGuide } from '../../../features/proof/reference/ProofKeyboardGuide';
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
  initialFormat = 'fitch',
}: {
  onStart: (statement: PracticeStatement) => void;
  initialFormat?: PracticeStatement['format'];
}) {
  const confirmDiscard = useConfirmDiscard();
  const [format, setFormat] = useState(initialFormat);
  const [premises, setPremises] = useState<PracticeStatement['premises']>([]);
  const [conclusion, setConclusion] = useState('');
  const [ruleIds, setRuleIds] = useState<string[]>(
    PROPOSITIONAL_RULE_CATALOG.map((rule) => rule.id),
  );
  const [error, setError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  useUnsavedWork(
    premises.length > 0 ||
      conclusion.length > 0 ||
      ruleIds.length !== PROPOSITIONAL_RULE_CATALOG.length,
  );

  function changeFormat(next: PracticeStatement['format']) {
    if (next === format) return;

    confirmDiscard(() => {
      setFormat(next);
      setPremises([]);
      setConclusion('');
      setRuleIds(PROPOSITIONAL_RULE_CATALOG.map((rule) => rule.id));
      setError(null);
    });
  }

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
    <form
      className="panel proof-editor proof-practice-setup"
      aria-label="Proof practice setup"
      onSubmit={submit}
    >
      <h2>Set up a proof</h2>
      <div className="proof-setup-toolbar">
        <div>
          <label htmlFor="practice-proof-format">Proof format</label>
          <select
            id="practice-proof-format"
            value={format}
            onChange={(event) => changeFormat(event.target.value as PracticeStatement['format'])}
          >
            <option value="fitch">Fitch</option>
            <option value="dependency">Dependency</option>
            <option value="tree">Natural-deduction tree</option>
          </select>
        </div>
        <ProofKeyboardGuide />
      </div>
      <section className="proof-setup-premises" aria-label="Starting premises">
        <h3>
          Premises <span className="help">(optional)</span>
        </h3>
        {premises.map((premise, index) => (
          <div className="proof-setup-premise" key={premise.id}>
            <label htmlFor={`practice-premise-${premise.id}`}>Premise {index + 1}</label>
            <div>
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
                className="text-button"
                onClick={() => setPremises(premises.filter((value) => value.id !== premise.id))}
              >
                Remove premise {index + 1}
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          disabled={premises.length >= PROOF_LIMITS.maxPremises}
          onClick={() => setPremises([...premises, { id: crypto.randomUUID(), formula: '' }])}
        >
          Add premise
        </button>
      </section>
      <div className="proof-setup-conclusion">
        <label htmlFor="practice-proof-conclusion">Conclusion</label>
        <input
          {...formulaInput}
          id="practice-proof-conclusion"
          required
          value={conclusion}
          onChange={(event) => setConclusion(event.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="proof-setup-actions">
        <button type="button" className="secondary" onClick={() => setRulesOpen(true)}>
          Permitted rules ({ruleIds.length} selected)
        </button>
        <button type="submit">Begin proof practice</button>
      </div>
      {rulesOpen && (
        <PracticeRuleDialog
          selected={ruleIds}
          onChange={setRuleIds}
          onClose={() => setRulesOpen(false)}
        />
      )}
    </form>
  );
}
