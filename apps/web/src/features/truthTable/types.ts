export type Answers = Record<string, boolean | null>;
export const cellKey = (rowId: string, columnId: string) => JSON.stringify([rowId, columnId]);
