import type { FormulaErrorCode } from './types';

/** Position is a zero-based UTF-16 offset; end-of-input uses source.length. */
export class FormulaParseError extends Error {
  readonly name = 'FormulaParseError';

  constructor(
    public readonly code: FormulaErrorCode,
    public readonly position: number,
    message: string,
  ) {
    super(`${message} (at character ${position + 1}).`);
  }
}
