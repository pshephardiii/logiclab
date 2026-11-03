import type { ProblemEditorFields } from './problem-editor';

export function changeConceptualOption(
  fields: ProblemEditorFields,
  id: string,
  text: string,
): ProblemEditorFields {
  return {
    ...fields,
    options: fields.options.map((option) => (option.id === id ? { ...option, text } : option)),
  };
}

export function moveConceptualOption(
  fields: ProblemEditorFields,
  index: number,
  delta: number,
): ProblemEditorFields {
  const options = [...fields.options];
  [options[index], options[index + delta]] = [options[index + delta]!, options[index]!];
  return { ...fields, options };
}

export function removeConceptualOption(
  fields: ProblemEditorFields,
  id: string,
): ProblemEditorFields {
  return {
    ...fields,
    options: fields.options.filter((option) => option.id !== id),
    correctOptionId: fields.correctOptionId === id ? '' : fields.correctOptionId,
  };
}
