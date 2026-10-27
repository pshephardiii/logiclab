const operators = [
  { name: 'Not', symbol: '¬', keyboard: ['!'] },
  { name: 'And', symbol: '∧', keyboard: ['&'] },
  { name: 'Or', symbol: '∨', keyboard: ['v', '|'] },
  { name: 'If … then …', symbol: '→', keyboard: ['->'] },
  { name: 'Group expressions', symbol: '( )', keyboard: ['( )', '[ ]'] },
];

/** A student-facing reference pairs keyboard notation with logical symbols. */
export function FormulaKey() {
  return (
    <aside className="formula-key" aria-labelledby="keyboard-guide-heading">
      <h3 id="keyboard-guide-heading">Keyboard guide</h3>
      <p>Use the keyboard shortcuts below to write your formula.</p>
      <table className="formula-key-table">
        <caption>Keyboard inputs and their logical symbols</caption>
        <thead>
          <tr>
            <th scope="col">Meaning</th>
            <th scope="col">Key</th>
            <th scope="col">Symbol</th>
          </tr>
        </thead>
        <tbody>
          {operators.map(({ name, symbol, keyboard }) => (
            <tr key={symbol}>
              <th scope="row">{name}</th>
              <td>
                {keyboard.map((key, index) => (
                  <span key={key}>
                    {index > 0 && ' or '}
                    <kbd>{key}</kbd>
                  </span>
                ))}
              </td>
              <td className="keyboard-symbol">{symbol}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="formula-key-example">
        For example: <code>[(P &amp; Q) -&gt; R]</code>
      </p>
    </aside>
  );
}
