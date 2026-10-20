import type { FastifyRequest } from 'fastify';
import type { BillingContext } from './context';
import { AuthError } from '../../application/auth/service';
import { BillingError } from '../../application/billing/errors';
import { cookieName } from '../auth/cookies';

export async function billingInstructor(request: FastifyRequest, context: BillingContext) {
  const cached = request as FastifyRequest & { billingUser?: { id: string; role: string } };
  if (cached.billingUser) return cached.billingUser;
  const token = request.cookies[cookieName(context.config)];
  if (!token) throw new AuthError('SESSION_INVALID');
  const user = await context.service.authenticate(token);
  if (user.role !== 'instructor') throw new BillingError('instructor_required');
  cached.billingUser = user;
  return user;
}
