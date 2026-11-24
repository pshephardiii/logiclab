/** Pending entries retain interior blanks; saved edits remove cleared slots immediately. */
export function updatedCitationSlots(
  references: readonly string[],
  slot: number,
  id: string | null,
  staged: boolean,
): string[] {
  const refs = [...references];
  if (staged) {
    for (let position = refs.length; position <= slot; position++) refs.push('');
    refs[slot] = id ?? '';
    while (refs.at(-1) === '') refs.pop();
    return refs;
  }

  if (id) refs[slot] = id;
  else refs.splice(slot, 1);
  return refs.filter(Boolean);
}
