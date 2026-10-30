import type { ConceptualQuestionDefinition } from '@logiclab/contracts';

/** Versioned synthetic content only; billing terms come from the saved simulator plan. */
export const DEMO_TEMPLATE = {
  version: 5,
  assignmentPoints: 20,
  mixedPoints: [20, 5, 5],
  fundedClassName: 'Demo: Introduction to Logic',
  unpaidClassName: 'Demo: Try simulated checkout',
  problemTitle: 'Implication and disjunction',
  problemInstructions: 'Complete the truth table for the formula. Use T or F in each answer cell.',
  formula: '(P -> Q) & (!P | Q)',
  assignmentTitle: 'Your first truth-table assignment',
  practiceAssignmentTitle: 'Explore tables and concepts at your own pace',
  mixedAssignmentTitle: 'Tables and concepts: separate grade and answer release',
  mixedAssignmentInstructions:
    'Complete the 20-point table and two 5-point conceptual questions (30 points total). Save each problem, then submit. Switch to the instructor to release grades and reveal answers independently.',
  practiceAssignmentInstructions:
    'Answers are checked automatically after you pause editing. You can also use Check answers or save explicitly. Solutions are available anytime; there is no final submission.',
  assignmentInstructions:
    'Fill in the 20-point table, save your progress, then submit to see feedback and your point score.',
} as const;

/** Stable option IDs belong to the pinned question, not to global database rows. */
export const DEMO_CONCEPTUAL_QUESTIONS: {
  title: string;
  instructions: string;
  definition: ConceptualQuestionDefinition;
}[] = [
  {
    title: 'Recognize a contradiction',
    instructions: 'Choose True or False.',
    definition: {
      type: 'true_false',
      definitionVersion: 1,
      question: 'A contradiction is true under every interpretation.',
      correctAnswer: false,
      explanation:
        'A contradiction is false under every interpretation. A tautology is true under every interpretation.',
    },
  },
  {
    title: 'Classify a formula',
    instructions: 'Choose exactly one answer.',
    definition: {
      type: 'multiple_choice',
      definitionVersion: 1,
      question: 'What do we call a formula that is true under every interpretation?',
      options: [
        { id: 'c1111111-1111-4111-8111-111111111111', text: 'Tautology' },
        { id: 'c2222222-2222-4222-8222-222222222222', text: 'Contradiction' },
        { id: 'c3333333-3333-4333-8333-333333333333', text: 'Contingency' },
      ],
      correctOptionId: 'c1111111-1111-4111-8111-111111111111',
      explanation:
        'A tautology is true under every interpretation; a contradiction is always false; a contingency is true under some interpretations and false under others.',
    },
  },
];
