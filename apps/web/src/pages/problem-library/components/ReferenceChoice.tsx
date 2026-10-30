import { useId } from 'react';

type Props = {
  label: string;
  value: string | null;
  choices: { id: string; label: string }[];
  empty?: string;
  onChange: (id: string | null) => void;
};

/** Retain unresolved IDs as explicit choices instead of silently selecting another target. */
export function ReferenceChoice({ label, value, choices, empty = 'None', onChange }: Props) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">{empty}</option>
        {value && !choices.some((choice) => choice.id === value) && (
          <option value={value}>Missing or unavailable target — choose a replacement</option>
        )}
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.label}
          </option>
        ))}
      </select>
    </div>
  );
}
