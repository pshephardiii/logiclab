import { AssignmentOperationError } from '../../../application/assignment/errors';
import { buildApp } from '../../../app';
import { assignmentFixture, assignment, classId } from '../../../../test/assignment-fixture';
import { sessionId } from '../../../../test/auth-fixture';

test('POST postAssignmentPublish enforces the route contract and authenticates once', async () => {
  const { context, headers, service } = assignmentFixture();
  const app = buildApp({ assignment: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/api/assignments/${assignment.id}/publish`,
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
      payload: {},
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(service.authenticate).toHaveBeenCalledTimes(1);
  } finally {
    await app.close();
  }
});

test('maps missing coverage to a useful conflict response without changing the assignment', async () => {
  const { context, headers, assignments } = assignmentFixture();
  assignments.publish.mockRejectedValueOnce(new AssignmentOperationError('coverage_required'));
  const app = buildApp({ assignment: context });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/api/assignments/${assignment.id}/publish`,
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
      payload: {},
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CLASS_COVERAGE_REQUIRED');
    expect(response.json().error.message).toContain('Existing published work remains available');
  } finally {
    await app.close();
  }
});
