/** Version the exact variants, not textbook labels. No rule is enabled by this catalog alone. */
export const PROPOSITIONAL_RULE_CATALOG_VERSION = 1;

type RuleDefinition = {
  id: string;
  label: string;
  aliases: readonly string[];
  category: 'core' | 'derived' | 'classical';
  lineReferences: number;
  subproofReferences: number;
};

const definitions = [
  {
    id: 'reiteration',
    label: 'Reiteration',
    aliases: ['Copy', 'R'],
    category: 'core',
    lineReferences: 1,
    subproofReferences: 0,
  },
  {
    id: 'and_introduction',
    label: 'Conjunction introduction',
    aliases: ['Conjunction', '∧I'],
    category: 'core',
    lineReferences: 2,
    subproofReferences: 0,
  },
  {
    id: 'and_elimination',
    label: 'Conjunction elimination',
    aliases: ['Simplification', '∧E'],
    category: 'core',
    lineReferences: 1,
    subproofReferences: 0,
  },
  {
    id: 'or_introduction',
    label: 'Disjunction introduction',
    aliases: ['Addition', '∨I'],
    category: 'core',
    lineReferences: 1,
    subproofReferences: 0,
  },
  {
    id: 'or_elimination',
    label: 'Disjunction elimination',
    aliases: ['Proof by cases', '∨E'],
    category: 'core',
    lineReferences: 1,
    subproofReferences: 2,
  },
  {
    id: 'implication_introduction',
    label: 'Implication introduction',
    aliases: ['Conditional introduction', 'Conditional proof', '→I', 'CP'],
    category: 'core',
    lineReferences: 0,
    subproofReferences: 1,
  },
  {
    id: 'implication_elimination',
    label: 'Implication elimination',
    aliases: ['Conditional elimination', 'Modus ponens', '→E', 'MP'],
    category: 'core',
    lineReferences: 2,
    subproofReferences: 0,
  },
  {
    id: 'negation_introduction',
    label: 'Negation introduction',
    aliases: ['¬I'],
    category: 'core',
    lineReferences: 0,
    subproofReferences: 1,
  },
  {
    id: 'contradiction_introduction',
    label: 'Contradiction introduction',
    aliases: ['Negation elimination', '⊥I', '¬E'],
    category: 'core',
    lineReferences: 2,
    subproofReferences: 0,
  },
  {
    id: 'contradiction_elimination',
    label: 'Contradiction elimination',
    aliases: ['Explosion', 'Ex falso', '⊥E'],
    category: 'core',
    lineReferences: 1,
    subproofReferences: 0,
  },
  {
    id: 'biconditional_introduction',
    label: 'Biconditional introduction',
    aliases: ['↔I'],
    category: 'core',
    lineReferences: 2,
    subproofReferences: 0,
  },
  {
    id: 'biconditional_elimination',
    label: 'Biconditional elimination',
    aliases: ['↔E'],
    category: 'core',
    lineReferences: 1,
    subproofReferences: 0,
  },
  {
    id: 'double_negation_introduction',
    label: 'Double-negation introduction',
    aliases: ['DNI'],
    category: 'derived',
    lineReferences: 1,
    subproofReferences: 0,
  },
  {
    id: 'modus_tollens',
    label: 'Modus tollens',
    aliases: ['MT'],
    category: 'derived',
    lineReferences: 2,
    subproofReferences: 0,
  },
  {
    id: 'disjunctive_syllogism',
    label: 'Disjunctive syllogism',
    aliases: ['DS'],
    category: 'derived',
    lineReferences: 2,
    subproofReferences: 0,
  },
  {
    id: 'hypothetical_syllogism',
    label: 'Hypothetical syllogism',
    aliases: ['HS'],
    category: 'derived',
    lineReferences: 2,
    subproofReferences: 0,
  },
  {
    id: 'double_negation_elimination',
    label: 'Double-negation elimination',
    aliases: ['DNE'],
    category: 'classical',
    lineReferences: 1,
    subproofReferences: 0,
  },
  {
    id: 'proof_by_contradiction',
    label: 'Proof by contradiction',
    aliases: ['Reductio ad absurdum', 'Indirect proof', 'RAA'],
    category: 'classical',
    lineReferences: 0,
    subproofReferences: 1,
  },
  {
    id: 'excluded_middle',
    label: 'Excluded middle',
    aliases: ['Law of excluded middle', 'LEM'],
    category: 'classical',
    lineReferences: 0,
    subproofReferences: 0,
  },
] as const satisfies readonly RuleDefinition[];

export type PropositionalRuleId = (typeof definitions)[number]['id'];

/** Labels are suggestions, not accepted rule identities or instructor permission defaults. */
export const PROPOSITIONAL_RULE_CATALOG = Object.freeze(
  definitions.map((rule) =>
    Object.freeze({
      ...rule,
      aliases: Object.freeze([...rule.aliases]),
    }),
  ),
);

export type PropositionalRule = (typeof PROPOSITIONAL_RULE_CATALOG)[number];

export function getPropositionalRule(id: string): PropositionalRule | undefined {
  return PROPOSITIONAL_RULE_CATALOG.find((rule) => rule.id === id);
}
