/** Application admission policy, separate from transport support for retained proof records. */
export const AVAILABLE_PROOF_FORMATS = ['fitch', 'dependency'] as const;

export type AvailableProofFormat = (typeof AVAILABLE_PROOF_FORMATS)[number];

/** Unknown future formats stay unavailable until deliberately admitted by the application. */
export function isProofFormatAvailable(format: string): format is AvailableProofFormat {
  return AVAILABLE_PROOF_FORMATS.some((available) => available === format);
}
