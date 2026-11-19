import { CheckerDiagnosticCode } from '@logiclab/contracts/checker-diagnostic-code';
import type { ProofDiagnostic } from '@logiclab/contracts';

export class InputFailure extends Error {
  constructor(
    readonly code: ProofDiagnostic['code'],
    message: string,
  ) {
    super(message);
  }
}

export function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new InputFailure(
      CheckerDiagnosticCode.InvalidStructure,
      'Proof input must contain plain data objects.',
    );

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null)
    throw new InputFailure(
      CheckerDiagnosticCode.InvalidStructure,
      'Proof input must contain plain data objects.',
    );

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !keys.includes(key))
      throw new InputFailure(
        CheckerDiagnosticCode.InvalidStructure,
        'Proof input contains unsupported fields.',
      );

    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;

    if (descriptor.get || descriptor.set)
      throw new InputFailure(
        CheckerDiagnosticCode.InvalidStructure,
        'Proof input must not contain accessors.',
      );
  }

  return value as Record<string, unknown>;
}

export function array(value: unknown, maximum: number): unknown[] {
  if (!Array.isArray(value))
    throw new InputFailure(CheckerDiagnosticCode.InvalidStructure, 'Expected a proof data list.');

  if (value.length > maximum)
    throw new InputFailure(CheckerDiagnosticCode.ResourceLimit, 'Proof input list limit exceeded.');

  if (
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length
  )
    throw new InputFailure(
      CheckerDiagnosticCode.InvalidStructure,
      'Proof lists must be plain arrays.',
    );

  for (const key in value) {
    if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length)
      throw new InputFailure(
        CheckerDiagnosticCode.InvalidStructure,
        'Proof lists contain unsupported properties.',
      );
  }

  const copy: unknown[] = [];

  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));

    if (!descriptor || descriptor.get || descriptor.set)
      throw new InputFailure(
        CheckerDiagnosticCode.InvalidStructure,
        'Proof lists must not contain holes or accessors.',
      );

    copy.push(descriptor.value);
  }

  return copy;
}

export function stringLimit(value: unknown, maximum: number): void {
  if (typeof value === 'string' && value.length > maximum)
    throw new InputFailure(CheckerDiagnosticCode.ResourceLimit, 'Proof input text limit exceeded.');
}

export function ids(value: Record<string, unknown>, keys: readonly string[]): void {
  for (const key of keys) stringLimit(value[key], 36);
}
