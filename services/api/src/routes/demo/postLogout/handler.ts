import type { FastifyRequest, FastifyReply } from 'fastify';
import type { DemoRuntime } from '../../../bootstrap/demo';
import { demoToken, setDemoCookie, publicDemoSession } from '../helpers';
import { clearSessionCookie } from '../../auth/cookies';

export function postLogoutHandler(runtime: DemoRuntime) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await runtime.sessions.logout(demoToken(request, runtime));
    clearSessionCookie(reply, runtime.config);
    return { message: 'Demo session ended.' };
  };
}
