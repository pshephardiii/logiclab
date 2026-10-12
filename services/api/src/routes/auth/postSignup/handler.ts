import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext } from '../context';
import { signupRequestSchema } from '@logiclab/schema';
import { parseBody, message, errorName } from '../helpers';

export function postSignupHandler(context: AuthContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, role } = parseBody(signupRequestSchema, request.body);
    try { await context.service.signup(email, password, role); }
    catch (error) { if (errorName(error) !== 'UsernameExistsException') throw error; }
    return reply.code(202).send(message('If signup can proceed, check your email for a confirmation code.'));
  };
}
