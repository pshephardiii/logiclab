/** Respect the API's 120-code-unit limit without splitting a Unicode character. */
export function duplicateAssignmentTitle(sourceTitle: string): string {
  let title = 'Copy of ';
  for (const character of sourceTitle) {
    if (title.length + character.length > 120) break;
    title += character;
  }
  return title.trimEnd();
}
