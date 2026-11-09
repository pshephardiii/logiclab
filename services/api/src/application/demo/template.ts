import type { LibraryProblemDefinition } from '@logiclab/contracts/problem-library';
import type { ConceptualQuestionDefinition } from '@logiclab/contracts';

/** Versioned synthetic content only; billing terms come from the saved simulator plan. */
export const DEMO_TEMPLATE = {
  version: 7,
  proofPracticeAssignmentTitle: 'Practice proofs in three formats',
  proofGradedAssignmentTitle: 'Derivations: separate grade and answer release',
  proofCompletionAssignmentTitle: 'Complete Fitch, dependency and tree proofs',
  proofPracticeInstructions:
    'Try the same conditional proof in Fitch, dependency and natural-deduction tree formats. Check proof is explicit; save each problem separately. Instructor references are available anytime. There is no final submission.',
  proofGradedInstructions:
    'Each proof is worth 20 points (60 total). Save each problem before submitting. Verified proofs earn full credit; other work needs instructor review. Switch to the instructor to adjust points and release grades and answers independently.',
  proofCompletionInstructions:
    'Finish and save all three proofs, then submit. Completion records no correctness score; proof diagnostics become available after submission. Switch to the instructor to reveal the reference answers.',
  proofPoints: 20,

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

/** Reference identities are local to each immutable proof; there are no global row references here. */
const assumptionId = 'd1111111-1111-4111-8111-111111111111';

const conclusionId = 'd2222222-2222-4222-8222-222222222222';

const blockId = 'd3333333-3333-4333-8333-333333333333';

const proofStatement = {
  type: 'derivation' as const,
  definitionVersion: 1 as const,
  ruleCatalogVersion: 1 as const,
  checkerVersion: 1 as const,
  premises: [],
  conclusion: 'P -> P',
  rules: [
    { id: 'implication_introduction', label: 'Conditional proof' },
    { id: 'reiteration', label: 'Reiteration' },
  ],
  explanation:
    'Assume P. The assumption itself supplies P. Discharge that assumption to conclude P → P without remaining assumptions.',
};

export const DEMO_DERIVATIONS: {
  title: string;
  instructions: string;
  definition: Extract<LibraryProblemDefinition, { type: 'derivation' }>;
}[] = [
  {
    title: 'Conditional identity — Fitch',
    instructions:
      'Prove P → P using a Fitch subproof. Open an assumption P, set its endpoint, then cite the closed subproof with Conditional proof.',
    definition: {
      ...proofStatement,
      format: 'fitch',
      referenceProof: {
        proofVersion: 1,
        format: 'fitch',
        steps: [
          { kind: 'assumption', id: assumptionId, blockId, formula: 'P' },
          {
            kind: 'inference',
            id: conclusionId,
            blockId: null,
            formula: 'P -> P',
            ruleId: 'implication_introduction',
            lineReferences: [],
            subproofReferences: [blockId],
          },
        ],
        blocks: [{ id: blockId, parentId: null, assumptionId, endId: assumptionId }],
      },
    },
  },
  {
    title: 'Conditional identity — Dependency',
    instructions:
      'Prove P → P with explicit dependency sets. The assumption P depends on itself. Cite it as both assumption and conclusion in a discharge pair; the final line has an empty dependency set.',
    definition: {
      ...proofStatement,
      format: 'dependency',
      referenceProof: {
        proofVersion: 1,
        format: 'dependency',
        steps: [
          { kind: 'assumption', id: assumptionId, formula: 'P', dependencies: [assumptionId] },
          {
            kind: 'inference',
            id: conclusionId,
            formula: 'P -> P',
            dependencies: [],
            ruleId: 'implication_introduction',
            lineReferences: [],
            discharges: [{ assumptionId, conclusionId: assumptionId }],
          },
        ],
      },
    },
  },
  {
    title: 'Conditional identity — Natural-deduction tree',
    instructions:
      'Prove P → P as a tree. Use an assumption leaf P below a Conditional proof root P → P. Select the P leaf as the supporting subtree, enter assumption P and discharge that leaf occurrence. Reiteration is available for a longer route too.',
    definition: {
      ...proofStatement,
      format: 'tree',
      referenceProof: {
        proofVersion: 1,
        format: 'tree',
        rootId: conclusionId,
        nodes: [
          {
            kind: 'inference',
            id: conclusionId,
            formula: 'P -> P',
            ruleId: 'implication_introduction',
            lineReferences: [],
            branches: [
              { rootId: assumptionId, assumptionFormula: 'P', assumptionIds: [assumptionId] },
            ],
          },
          { kind: 'assumption', id: assumptionId, formula: 'P' },
        ],
      },
    },
  },
];
