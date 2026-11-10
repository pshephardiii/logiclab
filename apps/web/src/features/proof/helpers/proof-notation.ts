const symbols: Record<string, string> = {
  '_|_': '⊥',
  '<->': '↔',
  '->': '→',
  '!': '¬',
  '~': '¬',
  '&': '∧',
  '|': '∨',
  v: '∨',
};

/** Token spelling only: retain incomplete/invalid formulas without checking or repairing them. */
export function proofNotation(value: string): string {
  return value.replace(/_\|_|<->|->|[!~&|v]/g, (token, offset: number) => {
    // Wait for the final underscore while the user is typing the contradiction alias.
    if (token === '|' && value[offset - 1] === '_') return token;
    return symbols[token]!;
  });
}
