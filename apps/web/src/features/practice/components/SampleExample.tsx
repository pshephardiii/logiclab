import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { SampleStage } from '../samples/stage';
import '../sample-actions.css';

/** Curated read-only stages never drive the live editor or generate checking feedback. */
export function SampleExample<Work>({
  title,
  introduction,
  stages,
  renderWork,
  showCompletedAction = true,
}: {
  title: string;
  introduction: string;
  stages: readonly SampleStage<Work>[];
  renderWork: (work: Work, final: boolean) => ReactNode;
  showCompletedAction?: boolean;
}) {
  const [view, setView] = useState<'completed' | 'walkthrough' | null>(null);
  const [step, setStep] = useState(0);
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const index = view === 'completed' ? stages.length - 1 : step;
  const stage = stages[index]!;
  const final = index === stages.length - 1;

  useEffect(() => {
    if (view) heading.current?.focus();
  }, [view]);

  function startWalkthrough() {
    if (view === 'walkthrough') setView(null);
    else {
      setStep(0);
      setView('walkthrough');
    }
  }

  return (
    <div className="completed-sample">
      <div className="practice-sample-actions">
        <button
          type="button"
          className="secondary"
          aria-expanded={view === 'walkthrough'}
          aria-controls={id}
          onClick={startWalkthrough}
        >
          {view === 'walkthrough' ? 'Hide walkthrough' : 'Walk through the solution'}
        </button>
        {showCompletedAction && (
          <button
            type="button"
            className="secondary"
            aria-expanded={view === 'completed'}
            aria-controls={id}
            onClick={() => setView(view === 'completed' ? null : 'completed')}
          >
            {view === 'completed' ? 'Hide completed example' : 'View completed example'}
          </button>
        )}
      </div>
      {view && (
        <section
          id={id}
          className="panel completed-sample-content"
          aria-label={view === 'completed' ? 'Completed sample example' : 'Sample walkthrough'}
        >
          <h2 ref={heading} tabIndex={-1}>
            {view === 'completed' ? 'Completed example' : 'Sample walkthrough'}
          </h2>
          <h3>{title}</h3>
          <p>{introduction}</p>
          <p className="help">This example is separate from your work.</p>
          {view === 'walkthrough' ? (
            <>
              <p role="status" aria-live="polite" aria-atomic="true">
                Step {index + 1} of {stages.length}. {stage.caption}
              </p>
              <div className="practice-sample-actions" aria-label="Walkthrough steps">
                <button
                  type="button"
                  className="secondary"
                  disabled={index === 0}
                  onClick={() => setStep((value) => Math.max(0, value - 1))}
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={final}
                  onClick={() => setStep((value) => Math.min(stages.length - 1, value + 1))}
                >
                  Next step
                </button>
                <button type="button" className="secondary" onClick={() => setStep(0)}>
                  Restart example
                </button>
              </div>
            </>
          ) : (
            <p>{stage.caption}</p>
          )}
          <div
            key={`${view}:${index}`}
            className={view === 'walkthrough' ? 'sample-stage' : undefined}
          >
            {renderWork(stage.work, final)}
          </div>
        </section>
      )}
    </div>
  );
}
