import { ProblemType } from '@logiclab/contracts/problem-type';
import type { LibraryProblemDefinition } from '@logiclab/contracts/problem-library';
import type { ConceptualQuestionDefinition } from '@logiclab/contracts';

/** Versioned synthetic content only; billing terms come from the saved simulator plan. */
export const DEMO_TEMPLATE = {
  version: 9,
  truthTreePracticeAssignmentTitle: 'Practice truth trees: closed and open paths',
  truthTreeGradedAssignmentTitle: 'Truth trees: separate grade and answer release',
  truthTreeCompletionAssignmentTitle: 'Complete both truth trees',
  truthTreePracticeInstructions:
    'Build both trees. Check tree is explicit and does not save work. Save each problem separately; instructor references are available anytime. There is no final submission.',
  truthTreeGradedInstructions:
    'Each tree is worth 10 points (20 total). A verified valid argument or verified counterexample earns full credit; other attempts need instructor review. Save each problem and submit, then switch to the instructor to release grades and reveal reference answers independently.',
  truthTreeCompletionInstructions:
    'Finish every path in both trees and save each problem before submitting. Logical mistakes retain verification warnings without a correctness score. Reference answers remain hidden until the instructor reveals them.',
  truthTreePoints: 10,
  proofPracticeAssignmentTitle: 'Practice Fitch and dependency proofs',
  proofGradedAssignmentTitle: 'Derivations: separate grade and answer release',
  proofCompletionAssignmentTitle: 'Complete Fitch and dependency proofs',
  proofPracticeInstructions:
    'Try the same conditional proof in Fitch and dependency formats. Check proof is explicit; save each problem separately. Instructor references are available anytime. There is no final submission.',
  proofGradedInstructions:
    'Each proof is worth 20 points (40 total). Save each problem before submitting. Verified proofs earn full credit; other work needs instructor review. Switch to the instructor to adjust points and release grades and answers independently.',
  proofCompletionInstructions:
    'Finish and save both proofs, then submit. Completion records no correctness score; proof diagnostics become available after submission. Switch to the instructor to reveal the reference answers.',
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
      type: ProblemType.TrueFalse,
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
      type: ProblemType.MultipleChoice,
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
  type: ProblemType.Derivation,
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
  definition: Extract<LibraryProblemDefinition, { type: typeof ProblemType.Derivation }>;
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
];
