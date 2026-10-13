import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { classroomFixture, classroom } from '../../../../test/classroom-fixture';
import { sessionId } from '../../../../test/auth-fixture';
import { postInvitationHandler } from './handler';
const request = (extra: object = {}) => ({ cookies: { logiclab_session: sessionId }, params: { classId: classroom.id }, body: {}, ...extra }) as unknown as FastifyRequest;

test('returns a random code with seven-day expiry and saves only its hash for the session owner', async () => {
  const { context, classrooms, user } = classroomFixture(); const now = Date.parse('2026-10-13T12:00:00Z');
  const handler = postInvitationHandler(context, () => now);
  const first = await handler(request()); const second = await handler(request());
  expect(first.invitation.code).toMatch(/^[A-Za-z0-9_-]{32}$/);
  expect(first.invitation.expiresAt).toBe('2026-10-20T12:00:00.000Z');
  expect(second.invitation.code).not.toBe(first.invitation.code);
  expect(classrooms.replaceInvitation).toHaveBeenNthCalledWith(1, user.id, classroom.id, createHash('sha256').update(first.invitation.code).digest('hex'), new Date(first.invitation.expiresAt));
  expect(JSON.stringify(classrooms.replaceInvitation.mock.calls)).not.toContain(first.invitation.code);
});
test('foreign or missing classes do not return an invitation', async () => {
  const { context, classrooms } = classroomFixture(); classrooms.replaceInvitation.mockResolvedValue(false);
  await expect(postInvitationHandler(context)(request())).rejects.toMatchObject({ status: 404 });
});
test.each([{ body: { ownerId: classroom.id } }, { params: { classId: 'invalid' } }])('rejects spoofed or malformed input %j', async extra => {
  const { context, classrooms } = classroomFixture();
  await expect(postInvitationHandler(context)(request(extra))).rejects.toThrow('INVALID_REQUEST');
  expect(classrooms.replaceInvitation).not.toHaveBeenCalled();
});
test('requires an instructor session before updating invitations', async () => {
  const { context, classrooms, service, user } = classroomFixture(); const handler = postInvitationHandler(context);
  await expect(handler(request({ cookies: {} }))).rejects.toThrow('SESSION_INVALID');
  service.authenticate.mockResolvedValue({ ...user, role: 'student' });
  await expect(handler(request())).rejects.toMatchObject({ status: 403 });
  expect(classrooms.replaceInvitation).not.toHaveBeenCalled();
});
