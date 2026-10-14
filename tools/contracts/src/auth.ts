import { z } from 'zod';

// Reusable field and data shapes.
const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

const newPasswordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

const loginPasswordSchema = z.string().min(1).max(128);
const accountRoleSchema = z.enum(['student', 'instructor']);
const confirmationCodeSchema = z.string().regex(/^\d{6}$/);

const authUserSchema = z.strictObject({
  id: z.uuid(),
  role: accountRoleSchema,
});

const authErrorSchema = z.strictObject({
  code: z.string(),
  message: z.string(),
});

// Request contracts.
export const signupRequestSchema = z.strictObject({
  email: emailSchema,
  password: newPasswordSchema,
  role: accountRoleSchema,
});
export type SignupRequest = z.infer<typeof signupRequestSchema>;

export const loginRequestSchema = z.strictObject({
  email: emailSchema,
  password: loginPasswordSchema,
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const emailRequestSchema = z.strictObject({
  email: emailSchema,
});
export type EmailRequest = z.infer<typeof emailRequestSchema>;

export const confirmationRequestSchema = z.strictObject({
  email: emailSchema,
  code: confirmationCodeSchema,
});
export type ConfirmationRequest = z.infer<typeof confirmationRequestSchema>;

export const resetPasswordRequestSchema = confirmationRequestSchema.extend({
  password: newPasswordSchema,
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

export const emptyAuthRequestSchema = z.strictObject({});
export type EmptyAuthRequest = z.infer<typeof emptyAuthRequestSchema>;

// Response contracts.
export const authMessageResponseSchema = z.strictObject({
  message: z.string(),
});
export type AuthMessageResponse = z.infer<typeof authMessageResponseSchema>;

export const authUserResponseSchema = z.strictObject({
  user: authUserSchema,
});
export type AuthUserResponse = z.infer<typeof authUserResponseSchema>;

export const authErrorResponseSchema = z.strictObject({
  error: authErrorSchema,
});
export type AuthErrorResponse = z.infer<typeof authErrorResponseSchema>;
