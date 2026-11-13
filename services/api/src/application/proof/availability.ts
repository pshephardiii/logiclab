import { isProofFormatAvailable } from '@logiclab/contracts';

export class ProofMethodUnavailableError extends Error {
  constructor() {
    super('This proof method is unavailable for new work.');
  }
}

/** Call at new-work boundaries after validation/authorization, never for historical projections.
 * This policy guard neither checks a proof nor grants permission to read its retained data.
 */
export function assertProofFormatAvailable(format: string): void {
  if (!isProofFormatAvailable(format)) throw new ProofMethodUnavailableError();
}
