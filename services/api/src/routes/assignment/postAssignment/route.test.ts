import { buildApp } from '../../../app';
import { assignmentFixture, assignment, classId } from '../../../../test/assignment-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('POST postAssignment enforces the route contract and authenticates once', async () => {
  const { context, headers, service } = assignmentFixture();
  const app = buildApp({ assignment: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/api/classes/${classId}/assignments`,
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
      payload: { title: '  Homework  ' },
    });
    expect(response.statusCode).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(service.authenticate).toHaveBeenCalledTimes(1);
  } finally {
    await app.close();
  }
});
