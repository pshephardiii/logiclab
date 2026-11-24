import { randomUUID } from 'node:crypto';
import {
  derivationDefinitionFixture,
  dependencyDefinitionFixture,
} from '../../../test/derivation-fixture';
import { truthTreeDefinitionFixture } from '../../../test/truth-tree-fixture';
import {
  authoringDefinition,
  libraryProblemDefinition,
  libraryReferenceCheck,
  publicationDefinition,
} from './library-definition';
import { publicDerivationContent, derivationReferenceSolution } from './derivation/projections';
import { truthTreeContent, truthTreeReferenceSolution } from './truth-tree/authoring';
import { evaluateProofAnswer } from '../student-work/proof-response';
import {
  evaluateTruthTreeAnswer,
  evaluateTruthTreeCompletion,
} from '../student-work/truth-tree-response';

const source = 'P v (Q & R)';
const implicit = 'P v Q & R';

test.each(['fitch', 'dependency'] as const)(
  '%s reference, public content, assigned checks and reveal use the pinned policy',
  (format) => {
    const premiseId = randomUUID(),
      stepId = randomUUID();
    const common = {
      premises: [{ id: premiseId, formula: source }],
      conclusion: source,
      rules: [],
    };
    const step = { kind: 'premise' as const, id: stepId, premiseId, formula: source };
    const definition =
      format === 'fitch'
        ? {
            ...derivationDefinitionFixture(),
            ...common,
            referenceProof: {
              proofVersion: 1 as const,
              format: 'fitch' as const,
              steps: [{ ...step, blockId: null }],
              blocks: [],
            },
          }
        : {
            ...dependencyDefinitionFixture(),
            ...common,
            referenceProof: {
              proofVersion: 1 as const,
              format: 'dependency' as const,
              steps: [{ ...step, dependencies: [stepId] }],
            },
          };
    const pinned = publicationDefinition(definition);
    if (pinned.type !== 'derivation') throw new Error('fixture');
    expect(pinned.formulaGroupingVersion).toBe(1);
    expect(libraryReferenceCheck(pinned)).toMatchObject({
      status: 'checked',
      report: { status: 'accepted' },
    });
    const content = publicDerivationContent(pinned);
    expect(content.formulaGroupingVersion).toBe(1);
    expect(content).not.toHaveProperty('referenceProof');
    expect(derivationReferenceSolution(pinned).formulaGroupingVersion).toBe(1);
    const answer = { type: 'derivation', proof: structuredClone(definition.referenceProof) };
    answer.proof.steps[0]!.formula = implicit;
    const authoritative = { itemId: randomUUID(), problemVersionId: randomUUID(), content };
    expect(evaluateProofAnswer(authoritative, answer).report.status).toBe('needs_review');
    expect(
      evaluateProofAnswer(
        { ...authoritative, content: publicDerivationContent(definition) },
        answer,
      ).report.status,
    ).toBe('accepted');
    expect(() =>
      evaluateProofAnswer(authoritative, { ...answer, formulaGroupingVersion: undefined }),
    ).toThrow('invalid_answer');
    const badReference = { ...definition, referenceProof: answer.proof };
    expect(() => publicationDefinition(badReference)).toThrow();
    const unfinished = { ...definition, conclusion: 'P &', referenceProof: null };
    expect(authoringDefinition(unfinished)).toMatchObject({
      formulaGroupingVersion: 1,
      referenceProof: null,
    });
    expect(libraryProblemDefinition(definition)).not.toHaveProperty('formulaGroupingVersion');
    expect(() => authoringDefinition({ ...definition, conclusion: implicit })).toThrow(
      expect.objectContaining({ code: 'GROUPING_REQUIRED' }),
    );
    expect(() => authoringDefinition({ ...definition, formulaGroupingVersion: 2 })).toThrow();
  },
);

test('truth-tree publication, assigned checks, score-free completion and reference reveal retain grouping', () => {
  const definition = truthTreeDefinitionFixture();
  definition.premises[0]!.formula = source;
  definition.conclusion = source;
  definition.referenceTree!.occurrences[0]!.formula = source;
  definition.referenceTree!.occurrences[1]!.formula = `!(${source})`;
  const pinned = publicationDefinition(definition);
  if (pinned.type !== 'truth_tree') throw new Error('fixture');
  expect(pinned.formulaGroupingVersion).toBe(1);
  expect(truthTreeReferenceSolution(pinned).formulaGroupingVersion).toBe(1);
  const content = truthTreeContent(pinned);
  expect(content).not.toHaveProperty('referenceTree');
  expect(content.formulaGroupingVersion).toBe(1);
  const authoritative = { itemId: randomUUID(), problemVersionId: randomUUID(), content };
  const tree = structuredClone(definition.referenceTree!);
  tree.occurrences[0]!.formula = implicit;
  const answer = { type: 'truth_tree', tree, verdict: 'valid' };
  expect(evaluateTruthTreeAnswer(authoritative, answer).report.status).toBe('invalid');
  expect(evaluateTruthTreeCompletion(authoritative, answer)).toMatchObject({
    completedResponses: 1,
    report: { status: 'invalid' },
  });
  expect(
    evaluateTruthTreeAnswer({ ...authoritative, content: truthTreeContent(definition) }, answer)
      .report.status,
  ).toBe('verified');
  expect(() =>
    evaluateTruthTreeAnswer(authoritative, { ...answer, formulaGroupingVersion: undefined }),
  ).toThrow('invalid_answer');
  expect(() => publicationDefinition({ ...definition, referenceTree: tree })).toThrow();
  expect(authoringDefinition({ ...definition, conclusion: '', referenceTree: null })).toMatchObject(
    { formulaGroupingVersion: 1, referenceTree: null },
  );
  expect(() => authoringDefinition({ ...definition, conclusion: implicit })).toThrow(
    expect.objectContaining({ code: 'GROUPING_REQUIRED' }),
  );
  expect(() => authoringDefinition({ ...definition, formulaGroupingVersion: 2 })).toThrow();
});
