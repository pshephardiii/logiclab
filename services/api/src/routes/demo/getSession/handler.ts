import type { FastifyRequest, FastifyReply } from 'fastify';
import type { DemoRuntime } from '../../../bootstrap/demo';
import { demoToken, setDemoCookie, publicDemoSession } from '../helpers';

export function getSessionHandler(runtime: DemoRuntime) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    return publicDemoSession(await runtime.sessions.authenticate(demoToken(request, runtime)));
  };
}
