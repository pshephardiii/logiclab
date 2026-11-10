import { proofNotation } from '../helpers/proof-notation';
/** Keep the target beside the working proof rather than in a separate statement panel. */
export function ProofEditorHeading({ title, goal }: { title: string; goal?: string }) {
  return (
    <div className="proof-editor-heading">
      <h3>{title}</h3>
      {goal !== undefined && (
        <p className="proof-goal" aria-label="Proof conclusion">
          <span>Conclusion</span>
          <code>{proofNotation(goal) || '(blank)'}</code>
        </p>
      )}
    </div>
  );
}
