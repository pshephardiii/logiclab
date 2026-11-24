import { unexpectedFormulaCharacter } from '../../features/truth-tree/helpers/formula-presentation';
import { FormulaCharacterIssue } from '../../features/truth-tree/components/FormulaCharacterIssue';
import { ProblemType } from '@logiclab/contracts/problem-type';
import { useState, type FormEvent } from 'react';
import { Page } from '../../components/layout/Page';
import { PracticeNavigation } from '../../features/practice/PracticeNavigation';
import { ProofPremisesEditor } from '../../features/proof/components/ProofPremisesEditor';
import { FormulaInput } from '../../components/formula/FormulaInput';
import { ProofKeyboardGuide } from '../../features/proof/reference/ProofKeyboardGuide';
import { useUnsavedWork } from '../../features/unsaved-work/hooks/useUnsavedWork';
import { useConfirmDiscard } from '../../features/unsaved-work/hooks/useConfirmDiscard';
import { TruthTreeEditor } from '../../features/truth-tree/components/TruthTreeEditor';
import { TruthTreeSummary } from '../../features/truth-tree/components/TruthTreeSummary';
import { TruthTreeFeedback } from '../../features/truth-tree/components/TruthTreeFeedback';
import { TruthTreeVerdict } from '../../features/truth-tree/components/TruthTreeVerdict';
import {
  assessTruthTreeVerdict,
  type TruthTreeVerdict as Verdict,
} from '@logiclab/contracts/truth-tree-work';
import { initialTruthTree } from '../../features/truth-tree/helpers/construction';
import {
  truthTreeContentSchema,
  type TruthTreeContent,
} from '@logiclab/contracts/truth-tree-authoring';
import {
  TRUTH_TREE_LIMITS,
  type TruthTree,
  type TruthTreeCheckReport,
} from '@logiclab/contracts/truth-tree';
import { checkTruthTree, parseTruthTreeFormulaWithSyntax } from '@logiclab/logic-engine/truth-tree';
import { requireExplicitGrouping } from '@logiclab/logic-engine';
import '../../features/proof/components/proof-setup.css';

/** Anonymous page-session work; no account API, expected reference, points or browser storage. */
export function TruthTreePracticePage() {
  const [premises, setPremises] = useState<TruthTreeContent['premises']>([]);
  const [conclusion, setConclusion] = useState('');
  const [premisePending, setPremisePending] = useState(false);
  const [entryPending, setEntryPending] = useState(false);
  const [active, setActive] = useState<{ statement: TruthTreeContent; tree: TruthTree } | null>(
    null,
  );
  const [report, setReport] = useState<TruthTreeCheckReport | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [characterIssue, setCharacterIssue] = useState<
    (NonNullable<ReturnType<typeof unexpectedFormulaCharacter>> & { label: string }) | null
  >(null);
  useUnsavedWork(active !== null || premisePending || premises.length > 0 || conclusion.length > 0);
  const confirmDiscard = useConfirmDiscard();

  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (premisePending) return;
    setCharacterIssue(null);

    try {
      const statement = truthTreeContentSchema.parse({
        type: ProblemType.TruthTree,
        definitionVersion: 1,
        checkerVersion: 1,
        ruleCatalogVersion: 2,
        formulaGroupingVersion: 1,
        premises,
        conclusion,
      });
      for (const [index, premise] of statement.premises.entries()) {
        try {
          requireExplicitGrouping(parseTruthTreeFormulaWithSyntax(premise.formula));
        } catch (error) {
          const issue = unexpectedFormulaCharacter(premise.formula);
          if (issue) {
            setCharacterIssue({ ...issue, label: `Premise ${index + 1}` });
            setError(null);
            return;
          }
          throw new Error(
            `Premise ${index + 1}: ${error instanceof Error ? error.message : 'Invalid formula.'}`,
          );
        }
      }
      try {
        requireExplicitGrouping(parseTruthTreeFormulaWithSyntax(statement.conclusion));
      } catch (error) {
        const issue = unexpectedFormulaCharacter(statement.conclusion);
        if (issue) {
          setCharacterIssue({ ...issue, label: 'Conclusion' });
          setError(null);
          return;
        }
        throw new Error(
          `Conclusion: ${error instanceof Error ? error.message : 'Invalid formula.'}`,
        );
      }
      setActive({ statement, tree: initialTruthTree(statement) });
      setError(null);
      setReport(null);
      setVerdict(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Check the argument.');
    }
  }

  function restart() {
    confirmDiscard(() => {
      setActive(null);
      setCharacterIssue(null);
      setPremises([]);
      setConclusion('');
      setReport(null);
      setVerdict(null);
      setError(null);
      setEntryPending(false);
    });
  }

  return (
    <Page>
      <PracticeNavigation />
      <header>
        <p className="eyebrow">LogicLab / Independent practice</p>
        <h1>Practice a truth tree.</h1>
        {!active && (
          <p>
            Enter premises and a conclusion. Start with the premises and the negated conclusion.
          </p>
        )}
      </header>
      {!active ? (
        <form
          className="panel proof-editor truth-tree-practice-panel"
          aria-label="Truth-tree practice setup"
          onSubmit={start}
        >
          <ProofKeyboardGuide />
          <ProofPremisesEditor
            format="tree"
            premises={premises}
            onChange={(premises) => {
              setPremises(premises);
              setCharacterIssue(null);
            }}
            onPendingChange={setPremisePending}
          />
          <label htmlFor="truth-tree-practice-conclusion">Conclusion</label>
          <FormulaInput
            id="truth-tree-practice-conclusion"
            required
            maxLength={TRUTH_TREE_LIMITS.maxFormulaLength}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={conclusion}
            onValueChange={(formula) => {
              setConclusion(formula);
              setCharacterIssue(null);
            }}
          />
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {characterIssue && (
            <p role="alert">
              <FormulaCharacterIssue {...characterIssue} />
            </p>
          )}
          <button type="submit" disabled={premisePending}>
            Begin truth-tree practice
          </button>
        </form>
      ) : (
        <section className="panel proof-editor truth-tree-practice-panel">
          <TruthTreeSummary definition={active.statement} />
          <ProofKeyboardGuide />
          <button type="button" className="secondary" onClick={restart}>
            Start over
          </button>
          <TruthTreeEditor
            tree={active.tree}
            statement={active.statement}
            onPendingChange={setEntryPending}
            onChange={(tree) => {
              setActive({ ...active, tree });
              setReport(null);
            }}
          />
          <TruthTreeVerdict
            value={verdict}
            disabled={entryPending}
            onChange={(next) => {
              setVerdict(next);
              setReport(null);
            }}
          />
          <button
            type="button"
            disabled={entryPending}
            onClick={() => {
              if (!entryPending)
                setReport(
                  checkTruthTree({
                    problem: {
                      ruleCatalogVersion: active.statement.ruleCatalogVersion,
                      formulaGroupingVersion: active.statement.formulaGroupingVersion,
                      premises: active.statement.premises,
                      conclusion: active.statement.conclusion,
                    },
                    tree: active.tree,
                  }),
                );
            }}
          >
            Check tree
          </button>

          {report && !entryPending && (
            <TruthTreeFeedback
              tree={active.tree}
              report={report}
              verdict={assessTruthTreeVerdict(report, verdict)}
              showArgument={verdict !== null}
            />
          )}
        </section>
      )}
      <p className="help">Work is temporary; reloading clears this practice session.</p>
    </Page>
  );
}
