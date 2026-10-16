import type { TruthTable } from '@logiclab/logic-engine';
import { truthTableExerciseResponseSchema } from '@logiclab/contracts';

/** Student exercises contain given values only, never expected answer-column values. */
export function exerciseResponse(table: TruthTable) {
  const givenIds = new Set(
    table.columns.filter((column) => column.kind === 'given').map((column) => column.id),
  );
  return truthTableExerciseResponseSchema.parse({
    ...table,
    rows: table.rows.map((row) => ({
      id: row.id,
      values: Object.fromEntries(Object.entries(row.values).filter(([id]) => givenIds.has(id))),
    })),
  });
}
