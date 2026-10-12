import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext } from '../context';
import { confirmationRequestSchema } from '@logiclab/schema';
import { parseBody, message } from '../helpers';

export function postConfirmHandler(context: AuthContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, code } = parseBody(confirmationRequestSchema, request.body);
    await context.service.confirm(email, code);
    return message('Email confirmed. You can now sign in.');
  };
}
