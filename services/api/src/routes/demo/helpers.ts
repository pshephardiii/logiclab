import type { FastifyRequest, FastifyReply } from 'fastify';
import type { DemoActor } from '../../application/demo/types';
import type { DemoRuntime } from '../../bootstrap/demo';
import { cookieName, setSessionCookie } from '../auth/cookies';

export function demoToken(request: FastifyRequest, runtime: DemoRuntime) {
  return request.cookies[cookieName(runtime.config)] ?? '';
}
export function setDemoCookie(reply: FastifyReply, runtime: DemoRuntime, token: string) {
  setSessionCookie(reply, runtime.config, token, runtime.config.maxLifetimeSeconds);
}
export function publicDemoSession(actor: DemoActor) {
  return {
    mode: 'demo' as const,
    user: { id: actor.id, role: actor.role },
    workspace: { id: actor.workspaceId, generation: actor.generation },
    notice: 'Isolated demo with synthetic data. Simulated payments only; no real charges.',
  };
}
