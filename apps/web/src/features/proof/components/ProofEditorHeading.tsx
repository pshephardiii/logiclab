import type { ReactNode } from 'react';
import { proofNotation } from '../helpers/proof-notation';
/** Keep the target beside the working proof rather than in a separate statement panel. */
export function ProofEditorHeading({
  title,
  goal,
  goalActions,
}: {
  title: string;
  goal?: string;
  goalActions?: ReactNode;
}) {
  return (
    <div className="proof-editor-heading">
      <h3>{title}</h3>
      {goal !== undefined && (
        <div className="proof-conclusion-controls">
          <p className="proof-goal" aria-label="Proof conclusion">
            <span>Conclusion</span>
            <code>{proofNotation(goal) || '(blank)'}</code>
          </p>
          {goalActions}
        </div>
      )}
    </div>
  );
}
