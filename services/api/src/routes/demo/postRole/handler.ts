import type { FastifyRequest, FastifyReply } from 'fastify';
import type { DemoRuntime } from '../../../bootstrap/demo';
import { demoToken, setDemoCookie, publicDemoSession } from '../helpers';
import { demoRoleRequestSchema } from '@logiclab/contracts';

export function postRoleHandler(runtime: DemoRuntime) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { role } = demoRoleRequestSchema.parse(request.body);
    const session = await runtime.sessions.switchRole(demoToken(request, runtime), role);
    setDemoCookie(reply, runtime, session.sessionId);
    return publicDemoSession(session.actor);
  };
}
