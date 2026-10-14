import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext } from '../context';
import { confirmationRequestSchema } from '@logiclab/contracts';
import { parseRequest } from '../../helpers/parse-request';
import { message } from '../responses';

export function postConfirmHandler(context: AuthContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, code } = parseRequest(confirmationRequestSchema, request.body);
    await context.service.confirm(email, code);
    return message('Email confirmed. You can now sign in.');
  };
}
