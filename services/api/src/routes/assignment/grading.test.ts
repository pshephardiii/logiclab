import { buildApp } from '../../app';
import {
  gradingFixture,
  submissionId,
  gradingInput,
  initialGrading,
  updatedGrading,
  gradingHistoryEntry,
} from '../../../test/grading-fixture';
import { assignment } from '../../../test/assignment-fixture';
import { sessionId } from '../../../test/auth-fixture';
import { SubmissionGradingError } from '../../application/assignment/grading-errors';
const path = `/api/assignments/${assignment.id}/submissions/${submissionId}/grading`;
const operations = [
  { method: 'GET' as const, url: path, operation: 'read' as const, result: initialGrading },
  {
    method: 'PATCH' as const,
    url: path,
    payload: gradingInput,
    operation: 'update' as const,
    result: updatedGrading,
  },
  {
    method: 'GET' as const,
    url: path + '/history?limit=2&offset=4',
    operation: 'history' as const,
    result: { revisions: [gradingHistoryEntry], nextOffset: null },
  },
];

test.each(operations)(
  '$method $url authenticates once, requires an instructor and disables caching',
  async (operation) => {
    const { context, service, user, headers, submissionGrading } = gradingFixture();
    const app = buildApp({ assignment: context });
    try {
      expect((await app.inject({ ...operation, headers })).statusCode).toBe(401);
      service.authenticate.mockResolvedValue({ ...user, role: 'student' });
      const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
      expect((await app.inject({ ...operation, headers: authenticated })).statusCode).toBe(403);
      for (const method of Object.values(submissionGrading)) expect(method).not.toHaveBeenCalled();
      service.authenticate.mockResolvedValue(user);
      service.authenticate.mockClear();
      const response = await app.inject({ ...operation, headers: authenticated });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(operation.result);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(service.authenticate).toHaveBeenCalledTimes(1);
      expect(submissionGrading[operation.operation]).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  },
);

test('grading authorization precedes malformed identifiers and only exact origins can save', async () => {
  const { context, headers, submissionGrading, service, user } = gradingFixture();
  const app = buildApp({ assignment: context });
  const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
  try {
    const invalid = {
      method: 'PATCH' as const,
      url: '/api/assignments/bad/submissions/bad/grading',
      payload: gradingInput,
    };
    expect((await app.inject({ ...invalid, headers })).statusCode).toBe(401);
    service.authenticate.mockResolvedValue({ ...user, role: 'student' });
    expect((await app.inject({ ...invalid, headers: authenticated })).statusCode).toBe(403);
    service.authenticate.mockResolvedValue(user);
    expect((await app.inject({ ...invalid, headers: authenticated })).statusCode).toBe(400);
    for (const origin of [undefined, 'https://untrusted.example'])
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: path,
            payload: gradingInput,
            headers: { cookie: authenticated.cookie, ...(origin ? { origin } : {}) },
          })
        ).statusCode,
      ).toBe(403);
    expect(submissionGrading.update).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});

test.each([
  { ...gradingInput, reviewerId: 'forged' },
  { ...gradingInput, score: initialGrading.score },
  { ...gradingInput, revision: -1 },
  { ...gradingInput, items: [] },
  { ...gradingInput, items: [{ ...gradingInput.items[0], maxPoints: 1000 }] },
  { ...gradingInput, items: [{ ...gradingInput.items[0], report: {} }] },
  { ...gradingInput, items: [{ ...gradingInput.items[0], earnedPoints: 1.001 }] },
])('grading rejects forged/unbounded requests before storage: %j', async (payload) => {
  const { context, headers, submissionGrading } = gradingFixture();
  const app = buildApp({ assignment: context });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: path,
      payload,
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
    });
    expect(response.statusCode).toBe(400);
    expect(submissionGrading.update).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});

test.each([
  ['not_found', 404, 'SUBMISSION_NOT_FOUND'],
  ['archived', 409, 'ASSIGNMENT_ARCHIVED'],
  ['grading_unavailable', 409, 'SUBMISSION_GRADING_UNAVAILABLE'],
  ['revision_conflict', 409, 'SUBMISSION_GRADING_REVISION_CONFLICT'],
  ['invalid_grading', 400, 'SUBMISSION_GRADING_INVALID'],
] as const)('grading maps %s to a stable safe response', async (reason, status, code) => {
  const { context, headers, submissionGrading } = gradingFixture();
  submissionGrading.update.mockRejectedValue(new SubmissionGradingError(reason));
  const app = buildApp({ assignment: context });
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: path,
      payload: gradingInput,
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
    });
    expect(response.statusCode).toBe(status);
    expect(response.json().error.code).toBe(code);
    expect(response.headers['cache-control']).toBe('no-store');
  } finally {
    await app.close();
  }
});

test('grading history bounds pagination and sanitizes operational and invalid-response failures', async () => {
  const { context, headers, submissionGrading } = gradingFixture();
  const app = buildApp({ assignment: context });
  const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
  try {
    for (const query of ['limit=51', 'offset=-1', 'studentId=forged'])
      expect(
        (
          await app.inject({
            method: 'GET',
            url: path + '/history?' + query,
            headers: authenticated,
          })
        ).statusCode,
      ).toBe(400);
    expect(submissionGrading.history).not.toHaveBeenCalled();
    submissionGrading.read.mockRejectedValueOnce(new Error('Private database credentials'));
    const failed = await app.inject({ method: 'GET', url: path, headers: authenticated });
    expect(failed.statusCode).toBe(503);
    expect(failed.body).not.toContain('credentials');
    submissionGrading.read.mockResolvedValueOnce({
      ...initialGrading,
      referenceProof: 'Private reference',
    } as never);
    const invalid = await app.inject({ method: 'GET', url: path, headers: authenticated });
    expect(invalid.statusCode).toBe(503);
    expect(invalid.body).not.toContain('Private reference');
  } finally {
    await app.close();
  }
});

test('grading saves have a bounded per-minute budget and throttled requests never reach storage', async () => {
  const { context, headers, submissionGrading } = gradingFixture();
  const app = buildApp({ assignment: context });
  try {
    const request = {
      method: 'PATCH' as const,
      url: path,
      payload: gradingInput,
      headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
    };
    for (let count = 0; count < 60; count++)
      expect((await app.inject(request)).statusCode).toBe(200);
    expect((await app.inject(request)).statusCode).toBe(429);
    expect(submissionGrading.update).toHaveBeenCalledTimes(60);
  } finally {
    await app.close();
  }
});
