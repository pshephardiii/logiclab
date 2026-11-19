import {
  ProblemType as RootProblemType,
  objectiveProblemDefinitionSchema,
} from '@logiclab/contracts';
import { ProblemType, problemTypeSchema } from '@logiclab/contracts/problem-type';

test('shared problem types retain the exact wire values and reject unknown kinds', () => {
  const values = ['truth_table', 'true_false', 'multiple_choice', 'derivation', 'truth_tree'];

  expect(RootProblemType).toBe(ProblemType);
  expect(Object.values(ProblemType)).toEqual(values);
  expect(problemTypeSchema.options).toEqual(values);

  for (const value of values) {
    expect(problemTypeSchema.parse(value)).toBe(value);
  }

  for (const value of ['TruthTable', 'tree', 'future_problem', '', null]) {
    expect(problemTypeSchema.safeParse(value).success).toBe(false);
  }
});

test('shared problem types do not broaden objective-only definition admission', () => {
  expect(
    objectiveProblemDefinitionSchema.parse({
      type: ProblemType.TruthTable,
      definitionVersion: 1,
      formula: 'P',
    }),
  ).toEqual({ type: 'truth_table', definitionVersion: 1, formula: 'P' });

  for (const type of [ProblemType.Derivation, ProblemType.TruthTree]) {
    expect(
      objectiveProblemDefinitionSchema.safeParse({ type, definitionVersion: 1, formula: 'P' })
        .success,
    ).toBe(false);
  }
});
