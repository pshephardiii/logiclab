import type { PropositionalRuleId } from '@logiclab/logic-engine/proof/rules';

export type ExampleLine = {
  formula: string;
  kind: 'premise' | 'assumption' | 'inference';
  rule?: PropositionalRuleId;
  citations: number[];
  discharges: [number, number][];
  dependencies: number[];
  scope?: number;
};

type RuleReference = {
  premises: string[];
  branches?: { assumption: string; conclusion: string }[];
  conclusion: string;
  example: ExampleLine[];
};

const premise = (formula: string, position: number): ExampleLine => ({
  formula,
  kind: 'premise',
  citations: [],
  discharges: [],
  dependencies: [position],
});

const assumption = (formula: string, position: number): ExampleLine => ({
  formula,
  kind: 'assumption',
  citations: [],
  discharges: [],
  dependencies: [position],
  scope: position,
});

function inference(
  formula: string,
  rule: PropositionalRuleId,
  citations: number[],
  dependencies: number[],
  discharges: [number, number][] = [],
  scope?: number,
): ExampleLine {
  return { formula, kind: 'inference', rule, citations, dependencies, discharges, scope };
}

function direct(rule: PropositionalRuleId, premises: string[], conclusion: string): ExampleLine[] {
  const positions = premises.map((_, index) => index + 1);
  return [
    ...premises.map((formula, index) => premise(formula, index + 1)),
    inference(conclusion, rule, positions, positions),
  ];
}

/** Instructional content for exact catalog-v1 variants, never a proof-search or checking service. */
export const RULE_REFERENCE = {
  reiteration: {
    premises: ['A'],
    conclusion: 'A',
    example: direct('reiteration', ['P'], 'P'),
  },
  and_introduction: {
    premises: ['A', 'B'],
    conclusion: 'A ∧ B',
    example: direct('and_introduction', ['P', 'Q'], 'P ∧ Q'),
  },
  and_elimination: {
    premises: ['A ∧ B'],
    conclusion: 'A',
    example: direct('and_elimination', ['P ∧ Q'], 'Q'),
  },
  or_introduction: {
    premises: ['A'],
    conclusion: 'A ∨ B',
    example: direct('or_introduction', ['P'], 'P ∨ Q'),
  },
  or_elimination: {
    premises: ['A ∨ B'],
    branches: [
      { assumption: 'A', conclusion: 'C' },
      { assumption: 'B', conclusion: 'C' },
    ],
    conclusion: 'C',
    example: [
      premise('P ∨ Q', 1),
      premise('P → R', 2),
      premise('Q → R', 3),
      assumption('P', 4),
      inference('R', 'implication_elimination', [2, 4], [2, 4], [], 4),
      assumption('Q', 6),
      inference('R', 'implication_elimination', [3, 6], [3, 6], [], 6),
      inference(
        'R',
        'or_elimination',
        [1],
        [1, 2, 3],
        [
          [4, 5],
          [6, 7],
        ],
      ),
    ],
  },
  implication_introduction: {
    premises: [],
    branches: [{ assumption: 'A', conclusion: 'B' }],
    conclusion: 'A → B',
    example: [
      assumption('P', 1),
      inference('P', 'reiteration', [1], [1], [], 1),
      inference('P → P', 'implication_introduction', [], [], [[1, 2]]),
    ],
  },
  implication_elimination: {
    premises: ['A → B', 'A'],
    conclusion: 'B',
    example: direct('implication_elimination', ['P → Q', 'P'], 'Q'),
  },
  negation_introduction: {
    premises: [],
    branches: [{ assumption: 'A', conclusion: '⊥' }],
    conclusion: '¬A',
    example: [
      premise('¬P', 1),
      assumption('P', 2),
      inference('⊥', 'contradiction_introduction', [1, 2], [1, 2], [], 2),
      inference('¬P', 'negation_introduction', [], [1], [[2, 3]]),
    ],
  },
  contradiction_introduction: {
    premises: ['A', '¬A'],
    conclusion: '⊥',
    example: direct('contradiction_introduction', ['P', '¬P'], '⊥'),
  },
  contradiction_elimination: {
    premises: ['⊥'],
    conclusion: 'B',
    example: direct('contradiction_elimination', ['⊥'], 'Q'),
  },
  biconditional_introduction: {
    premises: ['A → B', 'B → A'],
    conclusion: 'A ↔ B',
    example: direct('biconditional_introduction', ['P → Q', 'Q → P'], 'P ↔ Q'),
  },
  biconditional_elimination: {
    premises: ['A ↔ B'],
    conclusion: 'A → B',
    example: direct('biconditional_elimination', ['P ↔ Q'], 'Q → P'),
  },
  double_negation_introduction: {
    premises: ['A'],
    conclusion: '¬¬A',
    example: direct('double_negation_introduction', ['P'], '¬¬P'),
  },
  modus_tollens: {
    premises: ['A → B', '¬B'],
    conclusion: '¬A',
    example: direct('modus_tollens', ['P → Q', '¬Q'], '¬P'),
  },
  disjunctive_syllogism: {
    premises: ['A ∨ B', '¬A'],
    conclusion: 'B',
    example: direct('disjunctive_syllogism', ['P ∨ Q', '¬P'], 'Q'),
  },
  hypothetical_syllogism: {
    premises: ['A → B', 'B → C'],
    conclusion: 'A → C',
    example: direct('hypothetical_syllogism', ['P → Q', 'Q → R'], 'P → R'),
  },
  double_negation_elimination: {
    premises: ['¬¬A'],
    conclusion: 'A',
    example: direct('double_negation_elimination', ['¬¬P'], 'P'),
  },
  proof_by_contradiction: {
    premises: [],
    branches: [{ assumption: '¬A', conclusion: '⊥' }],
    conclusion: 'A',
    example: [
      premise('P', 1),
      assumption('¬P', 2),
      inference('⊥', 'contradiction_introduction', [1, 2], [1, 2], [], 2),
      inference('P', 'proof_by_contradiction', [], [1], [[2, 3]]),
    ],
  },
  excluded_middle: {
    premises: [],
    conclusion: 'A ∨ ¬A',
    example: direct('excluded_middle', [], 'P ∨ ¬P'),
  },
} satisfies Record<PropositionalRuleId, RuleReference>;

export function getRuleReference(id: PropositionalRuleId): RuleReference {
  return RULE_REFERENCE[id];
}
