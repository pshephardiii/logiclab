import { dependencySetsMatch, inferenceDependencyIds } from '../src/proof';

const premise = 'premise';
const a = 'assumption-a';
const b = 'assumption-b';

test('ordinary inference combines source identities, deduplicates shared support and leaves inputs untouched', () => {
  const lines = [
    [premise, a],
    [premise, b],
  ];
  const before = structuredClone(lines);
  expect(inferenceDependencyIds(lines, [])).toEqual([a, b, premise]);
  expect(lines).toEqual(before);
});

test('conditional proof removes only its cited temporary assumption and retains other support', () => {
  expect(
    inferenceDependencyIds([], [{ assumptionId: a, conclusionDependencies: [premise, a, b] }]),
  ).toEqual([b, premise]);
  expect(inferenceDependencyIds([], [{ assumptionId: a, conclusionDependencies: [a] }])).toEqual(
    [],
  );
});

test('proof by cases discharges each branch separately and retains the disjunction context', () => {
  const branches = [
    { assumptionId: a, conclusionDependencies: [a, premise] },
    { assumptionId: b, conclusionDependencies: [b, premise] },
  ];
  const before = structuredClone(branches);
  expect(inferenceDependencyIds([[premise]], branches)).toEqual([premise]);
  expect(branches).toEqual(before);
});

test('discharging an assumption in one branch cannot erase its use in an ordinary citation', () => {
  expect(
    inferenceDependencyIds([[a]], [{ assumptionId: a, conclusionDependencies: [a, premise] }]),
  ).toEqual([a, premise]);
});

test('discharging an assumption in one branch cannot erase support in another branch', () => {
  expect(
    inferenceDependencyIds(
      [],
      [
        { assumptionId: a, conclusionDependencies: [a] },
        { assumptionId: b, conclusionDependencies: [a, b] },
      ],
    ),
  ).toEqual([a]);
});

test('vacuous discharge and a rule without citations add no invented dependency', () => {
  expect(
    inferenceDependencyIds([], [{ assumptionId: a, conclusionDependencies: [premise] }]),
  ).toEqual([premise]);
  expect(inferenceDependencyIds([], [])).toEqual([]);
});

test.each([
  [[a, b], [b, a], true],
  [[], [], true],
  [[a, a], [a], false],
  [[a], [a, a], false],
  [[a, b], [a], false],
  [[a], [a, b], false],
  [[a], [b], false],
])(
  'dependency comparison treats annotations as exact sets: %j versus %j',
  (declared, expected, matches) => {
    expect(dependencySetsMatch(declared, expected)).toBe(matches);
  },
);
