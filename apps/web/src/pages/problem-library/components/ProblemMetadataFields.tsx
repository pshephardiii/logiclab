import { ProblemType } from '@logiclab/contracts/problem-type';
import type { LibraryProblemDefinition } from '@logiclab/contracts/problem-library';
import type { ProblemEditorFields } from '../helpers/problem-editor';

export function ProblemMetadataFields({
  fields,
  onChange,
  typeDisabled,
  titleRequired,
}: {
  fields: ProblemEditorFields;
  onChange: (fields: ProblemEditorFields) => void;
  typeDisabled: boolean;
  titleRequired: boolean;
}) {
  return (
    <>
      <label htmlFor="problem-title">Title</label>
      <input
        id="problem-title"
        required={titleRequired}
        maxLength={120}
        value={fields.title}
        onChange={(event) => onChange({ ...fields, title: event.target.value })}
      />
      <label htmlFor="problem-instructions">Instructions</label>
      <textarea
        id="problem-instructions"
        maxLength={5000}
        value={fields.instructions}
        onChange={(event) => onChange({ ...fields, instructions: event.target.value })}
      />
      <label htmlFor="problem-type">Problem type</label>
      <select
        id="problem-type"
        disabled={typeDisabled}
        value={fields.type}
        onChange={(event) =>
          onChange({ ...fields, type: event.target.value as LibraryProblemDefinition['type'] })
        }
      >
        <option value={ProblemType.TruthTable}>Truth table</option>
        <option value={ProblemType.TrueFalse}>True/false</option>
        <option value={ProblemType.MultipleChoice}>Multiple choice</option>
        <option value={ProblemType.Derivation}>Derivation</option>
        <option value={ProblemType.TruthTree}>Truth tree</option>
      </select>
      <p className="help">
        Only the selected problem type is saved. Switching types keeps your fields until you leave
        this editor.
      </p>
    </>
  );
}
