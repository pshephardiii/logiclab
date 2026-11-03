type Props = {
  requiresCompleteAnswers: boolean;
  confirmed: boolean;
  blocked: boolean;
  submitting: boolean;
  onConfirmChange: (confirmed: boolean) => void;
  onSubmit: () => void;
};

/** Confirmation and submission eligibility remain controlled by the parent. */
export function FinalSubmissionPanel({
  requiresCompleteAnswers,
  confirmed,
  blocked,
  submitting,
  onConfirmChange,
  onSubmit,
}: Props) {
  return (
    <section className="panel">
      <h2>Final submission</h2>
      <p>
        {requiresCompleteAnswers
          ? 'Fill every answer cell, answer every question and finish each proof with formulas, rules, citations, closed subproofs and the requested final root conclusion. Save all edits before submitting. Correctness does not affect completion; no correctness score is recorded.'
          : 'Save all edited problems first. Blank cells count as unanswered. You may submit only once.'}
      </p>
      <label className="final-confirmation">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={blocked}
          onChange={(event) => onConfirmChange(event.target.checked)}
        />{' '}
        I understand submission is final and cannot be edited.
      </label>
      <button disabled={blocked || !confirmed} onClick={onSubmit}>
        {submitting ? 'Submitting…' : 'Submit final answers'}
      </button>
    </section>
  );
}
