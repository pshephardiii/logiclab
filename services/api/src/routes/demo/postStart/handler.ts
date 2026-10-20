import type { FastifyRequest, FastifyReply } from 'fastify';
import type { DemoRuntime } from '../../../bootstrap/demo';
import { demoToken, setDemoCookie, publicDemoSession } from '../helpers';
import { demoRoleRequestSchema } from '@logiclab/contracts';
import type { DemoActor } from '../../../application/demo/types';
import { DemoSessionError } from '../../../application/demo/service';

export function postStartHandler(runtime: DemoRuntime) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { role } = demoRoleRequestSchema.parse(request.body);
    const previous = demoToken(request, runtime);
    let current: DemoActor | null = null;
    if (previous) {
      try {
        current = await runtime.sessions.authenticate(previous);
      } catch (error) {
        if (!(error instanceof DemoSessionError)) throw error;
      }
    }
    if (current) {
      if (current.role === role) return publicDemoSession(current);
      const switched = await runtime.sessions.switchRole(previous, role);
      setDemoCookie(reply, runtime, switched.sessionId);
      return publicDemoSession(switched.actor);
    }
    const workspace = await runtime.workspaces.provision();
    const session = await runtime.sessions.issue(workspace.workspaceId, role);
    setDemoCookie(reply, runtime, session.sessionId);
    return publicDemoSession(session.actor);
  };
}
