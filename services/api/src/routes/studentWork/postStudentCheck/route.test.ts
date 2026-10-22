import { buildApp } from '../../../app';
import { studentWorkFixture, assignmentId, itemId } from '../../../../test/student-work-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('check authenticates once, requires exact origin, validates inputs and disables caching', async () => {
  const { context, service, studentWork, headers, user } = studentWorkFixture();
  const app = buildApp({ studentWork: context });
  const url = `/api/student/assignments/${assignmentId}/check`;
  const authorized = { ...headers, cookie: `logiclab_session=${sessionId}` };
  try {
    const response = await app.inject({
      method: 'POST',
      url,
      headers: authorized,
      payload: { itemId, answers: [] },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(service.authenticate).toHaveBeenCalledTimes(1);
    const invalid = await app.inject({
      method: 'POST',
      url,
      headers: authorized,
      payload: { itemId, answers: [], revision: 1 },
    });
    expect(invalid.statusCode).toBe(400);
    expect(studentWork.check).toHaveBeenCalledTimes(1);
    const denied = await app.inject({
      method: 'POST',
      url,
      headers: { ...authorized, origin: 'http://untrusted.test' },
      payload: { itemId, answers: [] },
    });
    expect(denied.statusCode).toBe(403);
    const anonymous = await app.inject({
      method: 'POST',
      url,
      headers,
      payload: { itemId, answers: [] },
    });
    expect(anonymous.statusCode).toBe(401);
    service.authenticate.mockResolvedValue({ ...user, role: 'instructor' });
    const instructor = await app.inject({
      method: 'POST',
      url,
      headers: authorized,
      payload: { itemId, answers: [] },
    });
    expect(instructor.statusCode).toBe(403);
    expect(studentWork.check).toHaveBeenCalledTimes(1);
  } finally {
    await app.close();
  }
});
