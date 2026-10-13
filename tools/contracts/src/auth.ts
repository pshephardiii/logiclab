import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const password = z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);
export const signupRequestSchema = z.strictObject({ email, password, role: z.enum(['student', 'instructor']) });
export const loginRequestSchema = z.strictObject({ email, password: z.string().min(1).max(128) });
export const emailRequestSchema = z.strictObject({ email });
export const confirmationRequestSchema = z.strictObject({ email, code: z.string().regex(/^\d{6}$/) });
export const resetPasswordRequestSchema = confirmationRequestSchema.extend({ password });
export const emptyAuthRequestSchema = z.strictObject({});
export const authMessageResponseSchema = z.strictObject({ message: z.string() });
export const authUserResponseSchema = z.strictObject({ user: z.strictObject({ id: z.uuid(), role: z.enum(['student', 'instructor']) }) });
export const authErrorResponseSchema = z.strictObject({ error: z.strictObject({ code: z.string(), message: z.string() }) });
