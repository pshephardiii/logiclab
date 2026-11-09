import './proof-reference.css';

export const PROOF_KEYBOARD_INPUTS = [
  { meaning: 'Sentence letters', keys: ['A–Z'], symbol: 'A–Z' },
  { meaning: 'Negation', keys: ['!', '~'], symbol: '¬' },
  { meaning: 'Conjunction', keys: ['&'], symbol: '∧' },
  { meaning: 'Disjunction', keys: ['v', '|'], symbol: '∨' },
  { meaning: 'Conditional', keys: ['->'], symbol: '→' },
  { meaning: 'Biconditional', keys: ['<->'], symbol: '↔' },
  { meaning: 'Contradiction', keys: ['_|_'], symbol: '⊥' },
  { meaning: 'Grouping', keys: ['( )', '[ ]'], symbol: '( ) or [ ]' },
];

export function ProofKeyboardGuide() {
  return (
    <details className="proof-keyboard-guide">
      <summary>Keyboard guide</summary>
      <div
        className="proof-reference-scroll"
        role="region"
        aria-label="Proof keyboard inputs"
        tabIndex={0}
      >
        <table className="proof-reference-table">
          <caption>Keyboard inputs for proof formulas</caption>
          <thead>
            <tr>
              <th scope="col">Meaning</th>
              <th scope="col">Key</th>
              <th scope="col">Symbol</th>
            </tr>
          </thead>
          <tbody>
            {PROOF_KEYBOARD_INPUTS.map(({ meaning, keys, symbol }) => (
              <tr key={meaning}>
                <th scope="row">{meaning}</th>
                <td aria-label={keys.join(' or ')}>
                  {keys.map((key, index) => (
                    <span key={key}>
                      {index > 0 && ' or '}
                      <kbd>{key}</kbd>
                    </span>
                  ))}
                </td>
                <td>{symbol}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Associate this hint with each proof formula input using its unique description ID. */
export function ProofFormulaHint({ id }: { id: string }) {
  return (
    <span id={id} className="proof-formula-hint">
      Contradiction: type <kbd>_|_</kbd> for ⊥.
    </span>
  );
}
