/** Point to the entered character without presenting parser internals or an operator inventory. */
export function FormulaCharacterIssue({
  label,
  formula,
  position,
  length,
}: {
  label: string;
  formula: string;
  position: number;
  length: number;
}) {
  return (
    <span className="truth-tree-character-issue">
      <span>
        {label} · check character {position + 1}:
      </span>{' '}
      <code>
        {formula.slice(0, position)}
        <mark aria-label="Character to check">{formula.slice(position, position + length)}</mark>
        {formula.slice(position + length)}
      </code>
    </span>
  );
}
