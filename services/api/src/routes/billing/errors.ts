import type { CookieConfig } from '../auth/cookies';
import { clearRejectedSessionCookie } from '../auth/cookies';
import type { FastifyInstance } from 'fastify';
import { BillingError } from '../../application/billing/errors';
import { mapAuthError } from '../auth/errors';

const failures = {
  instructor_required: { status: 403, message: 'An instructor account is required.' },
  not_found: { status: 404, message: 'Class or purchase not found.' },
  plan_unavailable: { status: 409, message: 'This plan is unavailable for class checkout.' },
  request_conflict: {
    status: 409,
    message: 'This request ID was already used for different checkout terms.',
  },
  checkout_pending: {
    status: 409,
    message: 'This class already has a pending checkout. Use purchase history to resolve it.',
  },
  checkout_paid: {
    status: 409,
    message: 'This class has already been paid for. Another checkout is not available.',
  },
  checkout_covered: {
    status: 409,
    message: 'This class already has publishing coverage. Another checkout is not available.',
  },
  invalid_event: { status: 400, message: 'Payment event could not be accepted.' },
  event_conflict: {
    status: 409,
    message: 'Payment event identity conflicts with a previous delivery.',
  },
  invalid_signature: { status: 400, message: 'Payment event could not be verified.' },
};

export function installBillingErrors(app: FastifyInstance, config: CookieConfig) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof BillingError) {
      const failure = failures[error.reason];
      return reply.code(failure.status).send({
        error: { code: `BILLING_${error.reason.toUpperCase()}`, message: failure.message },
      });
    }
    const mapped = mapAuthError(error);
    if (mapped.status === 401) clearRejectedSessionCookie(reply, config);
    if (mapped.status === 503)
      request.log.warn({ code: 'BILLING_UNAVAILABLE' }, 'Billing operation unavailable');
    return reply.code(mapped.status).send({
      error: {
        code: mapped.code,
        message: mapped.status === 503 ? 'Billing is temporarily unavailable.' : mapped.message,
      },
    });
  });
}
