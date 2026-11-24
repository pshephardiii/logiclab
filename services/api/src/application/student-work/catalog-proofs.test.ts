import { randomUUID } from 'node:crypto';
import {
  fitchChainDefinitionFixture,
  dependencyChainDefinitionFixture,
} from '../../../test/derivation-fixture';
import {
  publicDerivationContent,
  derivationReferenceSolution,
} from '../problem/derivation/projections';
import { authoringDefinition, libraryReferenceCheck } from '../problem/library-definition';
import { validateProofAnswer, evaluateProofAnswer } from './proof-response';
import { evaluateProofCompletion } from './proof-completion';
import { DerivationAuthoringError } from '../problem/derivation/errors';
import { fitchDerivationSolutionSchema } from '@logiclab/contracts/derivation';
import { dependencyDerivationSolutionSchema } from '@logiclab/contracts/dependency-derivation';

for (const fixture of [fitchChainDefinitionFixture, dependencyChainDefinitionFixture]) {
  const format = fixture().format;
  test(`${format} catalog-2 publication evidence and reveal preserve independent source/answer projections`, () => {
    const definition = fixture();
    const before = structuredClone(definition);
    expect(authoringDefinition(definition)).toEqual(definition);
    expect(libraryReferenceCheck(definition)).toMatchObject({
      status: 'checked',
      report: { status: 'accepted', ruleCatalogVersion: 2 },
    });
    const content = publicDerivationContent(definition);
    expect(content).toMatchObject({ ruleCatalogVersion: 2, formulaGroupingVersion: 1 });
    expect(content).not.toHaveProperty('referenceProof');
    expect(content).not.toHaveProperty('explanation');
    const solution = derivationReferenceSolution(definition);
    const solutionSchema =
      format === 'fitch' ? fitchDerivationSolutionSchema : dependencyDerivationSolutionSchema;
    expect(solutionSchema.safeParse({ ...solution, ruleCatalogVersion: 1 }).success).toBe(false);
    expect(
      solutionSchema.safeParse({ ...solution, formulaGroupingVersion: undefined }).success,
    ).toBe(false);
    expect(solution.referenceProof).toEqual(definition.referenceProof);
    expect(solution.explanation).toBe(definition.explanation);
    definition.premises[0]!.formula = '(P & Q) & R';
    expect(libraryReferenceCheck(definition)).toMatchObject({
      status: 'checked',
      report: { status: 'needs_review' },
    });
    expect(() => derivationReferenceSolution(definition)).toThrow(DerivationAuthoringError);
    expect(before.referenceProof).toEqual(solution.referenceProof);
  });

  test(`${format} catalog-2 answers check and complete against pinned content without assigning points`, () => {
    const definition = fixture();
    const itemId = randomUUID(),
      problemVersionId = randomUUID();
    const content = publicDerivationContent(definition);
    const authoritative = { itemId, problemVersionId, content };
    const answer = {
      type: 'derivation' as const,
      proof: structuredClone(definition.referenceProof!),
    };
    expect(validateProofAnswer(content, answer)).toEqual(answer);
    expect(evaluateProofAnswer(authoritative, answer)).toMatchObject({
      report: { status: 'accepted', ruleCatalogVersion: 2 },
    });
    const selected = answer.proof.steps[1]!;
    if (selected.kind !== 'inference') throw new Error('Expected extraction');
    selected.conjunctIndex = 1;
    const snapshot = structuredClone(answer);
    const completion = evaluateProofCompletion([{ id: itemId, problemVersionId, definition }], {
      [itemId]: answer,
    });
    expect(completion.items[0]).toMatchObject({
      report: { status: 'needs_review', ruleCatalogVersion: 2 },
      completedResponses: 1,
      totalResponses: 1,
    });
    expect(completion).not.toHaveProperty('score');
    expect(JSON.stringify(completion)).not.toContain('PRIVATE_CHAIN_REFERENCE');
    expect(answer).toEqual(snapshot);
    selected.conjunctIndex = 99;
    expect(() =>
      evaluateProofCompletion([{ id: itemId, problemVersionId, definition }], { [itemId]: answer }),
    ).toThrow(expect.objectContaining({ reason: 'incomplete_work' }));
  });

  test.each([1, 2] as const)(
    `${format} pinned catalog %s rejects a different saved/check/submission proof version`,
    (catalog) => {
      const original = publicDerivationContent(fixture());
      if (original.format === 'tree') throw new Error('Expected an enabled proof format');
      const content = { ...original, ruleCatalogVersion: catalog };
      const proof = {
        ...fixture().referenceProof!,
        proofVersion: catalog === 1 ? 2 : 1,
        steps: [],
      };
      const answer = { type: 'derivation', proof };
      expect(() => validateProofAnswer(content, answer)).toThrow(
        expect.objectContaining({ reason: 'invalid_answer' }),
      );
      expect(() =>
        evaluateProofAnswer(
          {
            itemId: randomUUID(),
            problemVersionId: randomUUID(),
            content: { ...content, rules: [] },
          },
          answer,
        ),
      ).toThrow(expect.objectContaining({ reason: 'invalid_answer' }));
    },
  );
}
