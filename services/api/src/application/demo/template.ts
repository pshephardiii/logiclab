/** Versioned synthetic content only; billing terms come from the saved simulator plan. */
export const DEMO_TEMPLATE = {
  version: 3,
  fundedClassName: 'Demo: Introduction to Logic',
  unpaidClassName: 'Demo: Try simulated checkout',
  problemTitle: 'Implication and disjunction',
  problemInstructions: 'Complete the truth table for the formula. Use T or F in each answer cell.',
  formula: '(P -> Q) & (!P | Q)',
  assignmentTitle: 'Your first truth-table assignment',
  practiceAssignmentTitle: 'Explore truth tables at your own pace',
  practiceAssignmentInstructions:
    'Answers are checked automatically after you pause editing. You can also use Check answers or save explicitly. Solutions are available anytime; there is no final submission.',
  assignmentInstructions: 'Fill in the table, save your progress, then submit to see feedback.',
} as const;
