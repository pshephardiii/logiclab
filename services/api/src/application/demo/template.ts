/** Versioned synthetic content only; billing terms come from the saved simulator plan. */
export const DEMO_TEMPLATE = {
  version: 1,
  fundedClassName: 'Demo: Introduction to Logic',
  unpaidClassName: 'Demo: Try simulated checkout',
  problemTitle: 'Implication and disjunction',
  problemInstructions: 'Complete the truth table for the formula. Use T or F in each answer cell.',
  formula: '(P -> Q) & (!P | Q)',
  assignmentTitle: 'Your first truth-table assignment',
  assignmentInstructions: 'Fill in the table, save your progress, then submit to see feedback.',
} as const;
