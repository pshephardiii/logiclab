import { z } from 'zod';

/** Transport budgets, not a claim that a structurally bounded proof is valid. */
export const PROOF_LIMITS = Object.freeze({
  maxSteps: 200,
  maxBlocks: 64,
  maxBlockDepth: 16,
  maxPremises: 50,
  maxFormulaLength: 256,
  maxPermittedRules: 64,
  maxDiagnostics: 500,
  maxCheckWork: 500_000,
});

export const proofReferenceIdSchema = z.uuid().transform((value) => value.toLowerCase());

export const proofFormulaTextSchema = z.string().max(PROOF_LIMITS.maxFormulaLength);

export const proofRuleIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/);
