import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
import { describe, expect, it } from 'vitest';
import {
  fitchProofSchema,
  dependencyProofSchema,
  proofCheckReportSchema,
  proofProblemSchema,
} from '@logiclab/contracts';
import { fitchDerivationContentSchema } from '@logiclab/contracts/derivation';
import { dependencyDerivationContentSchema } from '@logiclab/contracts/dependency-derivation';
import { truthTreeSchema, truthTreeCheckReportSchema } from '@logiclab/contracts/truth-tree';
import { truthTreeContentSchema } from '@logiclab/contracts/truth-tree-authoring';
import { TruthTreeVerdict } from '@logiclab/contracts/truth-tree-work';
import {
  generateTruthTable,
  parseFormulaWithSyntax,
  requireExplicitGrouping,
  evaluateFormula,
} from '@logiclab/logic-engine';
import {
  analyzeFitchStructure,
  analyzeDependencyStructure,
  checkFitchProof,
  checkDependencyProof,
} from '@logiclab/logic-engine/proof';
import {
  analyzeTruthTreeStructure,
  checkTruthTree,
  isFinishedTruthTreeAttempt,
} from '@logiclab/logic-engine/truth-tree';
import { createFitchSample, createDependencySample } from './derivations';
import { createTruthTreeSample } from './truth-trees';
import { createTruthTableSample } from './truth-table';

const proofFactories = [
  { name: 'Fitch', make: createFitchSample },
  { name: 'dependency', make: createDependencySample },
];

describe('public derivation samples', () => {
  it.each(proofFactories)(
    'has a genuinely accepted completed proof under its exact statement/rules: $name',
    ({ make }) => {
      const sample = make();
      const statement = sample.statement;
      const problem = proofProblemSchema.parse({
        ruleCatalogVersion: statement.ruleCatalogVersion,
        formulaGroupingVersion: statement.formulaGroupingVersion,
        premises: statement.premises,
        conclusion: statement.conclusion,
        permittedRuleIds: statement.rules.map((rule) => rule.id),
      });
      if (statement.format === 'fitch') fitchDerivationContentSchema.parse(statement);
      else dependencyDerivationContentSchema.parse(statement);
      const check = statement.format === 'fitch' ? checkFitchProof : checkDependencyProof;
      const report = proofCheckReportSchema.parse(check({ problem, proof: sample.completed }));
      expect(report.status, JSON.stringify(report.diagnostics)).toBe('accepted');
      expect(report.target).toBe('established');
      expect(
        check({ problem: { ...problem, permittedRuleIds: [] }, proof: sample.completed }).status,
      ).toBe('needs_review');
      expect(
        check({ problem: { ...problem, conclusion: 'R' }, proof: sample.completed }).status,
      ).toBe('needs_review');

      // Unfinished stages still need coherent identities, scopes, citations and locally valid lines.
      for (const stage of sample.stages) {
        expect(stage.caption.trim()).not.toBe('');
        const proof = stage.work;
        if (proof.format === 'fitch') {
          fitchProofSchema.parse(proof);
          const structure = analyzeFitchStructure(proof);
          expect(structure.status).toBe('resolved');
          expect(structure.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
            proof.blocks
              .filter((block) => block.endId === null)
              .map(() => CheckerDiagnosticCode.IncompleteProof),
          );
        } else {
          dependencyProofSchema.parse(proof);
          const structure = analyzeDependencyStructure(proof);
          expect(structure.status).toBe('resolved');
          expect(structure.diagnostics).toEqual([]);
        }
        const stageReport = check({ problem, proof });
        expect(stageReport.status).not.toBe('unassessable');
        expect(
          stageReport.steps.every(
            (step) => step.localStatus === 'valid' && step.dependencyStatus === 'valid',
          ),
        ).toBe(true);
      }
      expect(sample.stages[0]!.work.steps.every((step) => step.kind === 'premise')).toBe(true);
      expect(sample.stages.at(-1)!.work).toEqual(sample.completed);
      expect(
        sample.stages
          .slice(0, -1)
          .every((stage) => check({ problem, proof: stage.work }).status !== 'accepted'),
      ).toBe(true);
    },
  );

  it('teaches the same argument with format-specific discharge semantics', () => {
    const fitch = createFitchSample();
    const dependency = createDependencySample();
    expect(fitch.statement.premises).toEqual(dependency.statement.premises);
    expect(fitch.statement.conclusion).toBe(dependency.statement.conclusion);
    expect(fitch.stages.map((stage) => stage.work.steps.length)).toEqual([1, 2, 3, 4, 4, 5]);
    expect(dependency.stages.map((stage) => stage.work.steps.length)).toEqual([1, 2, 3, 4, 5]);
    expect(fitch.stages[3]!.work.blocks[0]!.endId).toBeNull();
    expect(fitch.stages[4]!.work.blocks[0]!.endId).toBe(fitch.completed.steps[3]!.id);
    expect(dependency.completed.steps.at(-1)!.dependencies).toEqual([
      dependency.completed.steps[0]!.id,
    ]);
  });

  it.each(proofFactories)(
    'returns independent editable copies and stage snapshots: $name',
    ({ make }) => {
      const original = make();
      const snapshot = structuredClone(original);
      const loaded = make();
      loaded.completed.steps[0]!.formula = 'R';
      loaded.statement.premises[0]!.formula = 'S';
      loaded.stages.at(-1)!.work.steps[0]!.formula = 'T';
      expect(loaded.stages[0]!.work).toEqual(snapshot.stages[0]!.work);
      expect(original).toEqual(snapshot);
      expect(make()).toEqual(snapshot);
    },
  );
});

describe('public semantic-tableaux samples', () => {
  it.each(Object.values(TruthTreeVerdict))(
    'verifies the %s example and every intermediate graph',
    (verdict) => {
      const sample = createTruthTreeSample(verdict);
      const problem = truthTreeContentSchema.parse(sample.statement);
      const input = {
        problem: {
          ruleCatalogVersion: problem.ruleCatalogVersion,
          formulaGroupingVersion: problem.formulaGroupingVersion,
          premises: problem.premises,
          conclusion: problem.conclusion,
        },
        tree: sample.completed,
      };
      const report = truthTreeCheckReportSchema.parse(checkTruthTree(input));
      expect(report.status, JSON.stringify(report)).toBe('verified');
      expect(report.argumentStatus).toBe(sample.verdict);
      expect(isFinishedTruthTreeAttempt(input)).toBe(true);
      expect(sample.stages.map((stage) => stage.work.branches.length)).toEqual([1, 3, 3, 3]);
      expect(sample.stages[1]!.work.expansions[0]!.resultGroups).toHaveLength(2);
      for (const stage of sample.stages) {
        truthTreeSchema.parse(stage.work);
        expect(analyzeTruthTreeStructure(stage.work).status).toBe('resolved');
        const checked = checkTruthTree({ ...input, tree: stage.work });
        expect(checked.steps.status, JSON.stringify(checked)).toBe('checked');
        expect(checked.steps.diagnostics).toEqual([]);
      }
      expect(sample.stages[0]!.work.expansions).toEqual([]);
      expect(sample.stages.at(-1)!.work).toEqual(sample.completed);
      if (verdict === TruthTreeVerdict.Valid) {
        expect(report.branches.every((branch) => branch.status === 'closed')).toBe(true);
        expect(report.counterexample).toBeNull();
      } else {
        expect(report.branches.some((branch) => branch.status === 'open_complete')).toBe(true);
        const assignment = report.counterexample!.assignment;
        expect(assignment).toEqual({ P: false, Q: false });
        expect(
          evaluateFormula(parseFormulaWithSyntax(problem.premises[0]!.formula).formula, assignment),
        ).toBe(true);
        expect(
          evaluateFormula(parseFormulaWithSyntax(problem.conclusion).formula, assignment),
        ).toBe(false);
      }
    },
  );

  it.each(Object.values(TruthTreeVerdict))(
    'keeps %s tree fixtures/stages independent on reload',
    (verdict) => {
      const sample = createTruthTreeSample(verdict);
      const snapshot = structuredClone(sample);
      sample.completed.occurrences[0]!.formula = 'R';
      sample.stages[1]!.work.branches[0]!.occurrenceIds.length = 0;
      sample.statement.premises[0]!.formula = 'S';
      expect(sample.stages[0]!.work).toEqual(snapshot.stages[0]!.work);
      expect(createTruthTreeSample(verdict)).toEqual(snapshot);
    },
  );
});

it('reveals table columns in order and agrees with real truth values and stable engine IDs', () => {
  const sample = createTruthTableSample();
  requireExplicitGrouping(parseFormulaWithSyntax(sample.formula));
  expect(sample.completed).toEqual(generateTruthTable(sample.formula));
  const answers = sample.completed.columns.filter((column) => column.kind === 'answer');
  expect(answers).toHaveLength(2);
  expect(sample.stages.map((stage) => stage.work.revealedColumnIds)).toEqual([
    [],
    [answers[0]!.id],
    answers.map((column) => column.id),
  ]);
  expect(
    sample.completed.rows.map((row) => answers.map((column) => row.values[column.id])),
  ).toEqual([
    [true, true],
    [false, true],
    [false, true],
    [false, true],
  ]);
  const snapshot = structuredClone(sample);
  sample.stages[1]!.work.revealedColumnIds.length = 0;
  Reflect.set(sample.completed.rows[0]!.values, answers[0]!.id, false);
  expect(sample.stages[2]!.work).toEqual(snapshot.stages[2]!.work);
  expect(createTruthTableSample()).toEqual(snapshot);
});
