import type { FastifyRequest, FastifyReply } from 'fastify';
import type { DemoRuntime } from '../../../bootstrap/demo';
import { demoToken, setDemoCookie, publicDemoSession } from '../helpers';

export function postResetHandler(runtime: DemoRuntime) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await runtime.workspaces.reset(demoToken(request, runtime));
    setDemoCookie(reply, runtime, session.sessionId);
    return publicDemoSession(session.actor);
  };
}
