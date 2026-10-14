import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext } from '../context';
import { emailRequestSchema } from '@logiclab/contracts';
import { parseRequest } from '../../helpers/parse-request';
import { message } from '../responses';
import { errorName } from '../../helpers/errors';
import { hiddenAccountErrors } from '../errors';

export function postForgotPasswordHandler(context: AuthContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = parseRequest(emailRequestSchema, request.body);
    try {
      await context.service.forgotPassword(email);
    } catch (error) {
      if (!hiddenAccountErrors.has(errorName(error))) throw error;
    }
    return reply
      .code(202)
      .send(message('If password recovery is available, a code will be sent to your email.'));
  };
}
