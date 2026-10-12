import type { FastifyReply, FastifyRequest } from 'fastify';

/** Only supplies body/code/send. Transport, registration, and error handling use route tests. */
export async function invokeHandler(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>,
  body: unknown,
): Promise<{ statusCode: number; body: unknown }> {
  let statusCode = 200;
  let sent = false;
  let sentBody: unknown;
  const reply = {
    code(status: number) { statusCode = status; return reply; },
    send(payload: unknown) { sent = true; sentBody = payload; return reply; },
  };
  // Deliberately minimal HTTP doubles; real Fastify behavior is tested through injection.
  const result = await handler({ body } as FastifyRequest, reply as unknown as FastifyReply);
  return { statusCode, body: sent ? sentBody : result };
}
