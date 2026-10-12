import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext } from '../context';
import { emailRequestSchema } from '@logiclab/schema';
import { parseBody, message, errorName, hiddenAccountErrors } from '../helpers';

export function postResendHandler(context: AuthContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = parseBody(emailRequestSchema, request.body);
    try { await context.service.resend(email); }
    catch (error) { if (!hiddenAccountErrors.has(errorName(error))) throw error; }
    return reply.code(202).send(message('If confirmation is available, a code will be sent to your email.'));
  };
}
