import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext } from '../context';
import { signupRequestSchema } from '@logiclab/contracts';
import { parseRequest } from '../../helpers/parse-request';
import { message } from '../responses';
import { errorName } from '../../helpers/errors';

/**
 * Starts signup while keeping the public response the same when an account already exists.
 */
export function postSignupHandler(context: AuthContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, role } = parseRequest(signupRequestSchema, request.body);
    try { await context.service.signup(email, password, role); }
    catch (error) { if (errorName(error) !== 'UsernameExistsException') throw error; }
    return reply.code(202).send(message('If signup can proceed, check your email for a confirmation code.'));
  };
}
