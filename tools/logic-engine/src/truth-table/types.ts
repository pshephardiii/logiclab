export type TruthTableColumn = {
  readonly id: string;
  readonly label: string;
  readonly kind: 'given' | 'answer';
  readonly isFinal: boolean;
};

export type TruthTableRow = {
  readonly id: string;
  readonly values: Readonly<Record<string, boolean>>;
};

/** Includes expected answers; callers must apply disclosure policy before sending to students. */
export type TruthTable = {
  readonly variables: readonly string[];
  readonly columns: readonly TruthTableColumn[];
  readonly rows: readonly TruthTableRow[];
};
