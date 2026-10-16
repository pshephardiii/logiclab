import { buildApp } from '../../../app';
import {
  studentWorkFixture,
  classId,
  assignmentId,
  itemId,
} from '../../../../test/student-work-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('PATCH patchStudentAttempt authenticates once and disables response caching', async () => {
  const { context, service, headers } = studentWorkFixture();
  const app = buildApp({ studentWork: context });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/student/assignments/${assignmentId}/attempt`,
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
      payload: { revision: 0, itemId, answers: [] },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(service.authenticate).toHaveBeenCalledTimes(1);
  } finally {
    await app.close();
  }
});
