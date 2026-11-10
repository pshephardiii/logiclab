export const coreGroups = [
  { label: 'Reiteration', ids: ['reiteration'] },
  { label: 'Conjunction', ids: ['and_introduction', 'and_elimination'] },
  { label: 'Disjunction', ids: ['or_introduction', 'or_elimination'] },
  { label: 'Implication', ids: ['implication_introduction', 'implication_elimination'] },
  {
    label: 'Negation and contradiction',
    ids: ['negation_introduction', 'contradiction_introduction', 'contradiction_elimination'],
  },
  { label: 'Biconditional', ids: ['biconditional_introduction', 'biconditional_elimination'] },
];

export const categories = [
  { id: 'derived', label: 'Derived rules' },
  { id: 'classical', label: 'Classical rules' },
] as const;
