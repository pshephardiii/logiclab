import { createDemoCleanupHandler } from './handler';

const context = () => ({ jobId: 'job', attempt: 1, signal: new AbortController().signal });

test('reports removed workspaces without reconciliation findings and forwards cancellation', async () => {
  const cleanup = jest.fn(async (_signal: AbortSignal) => ({ removed: 2 }));
  const input = context();
  await expect(createDemoCleanupHandler(cleanup)(input)).resolves.toEqual({
    recordsChecked: 2,
    findings: [],
  });
  expect(cleanup).toHaveBeenCalledWith(input.signal);
});

test('does not start an aborted job and propagates cleanup failures for retry', async () => {
  const controller = new AbortController();
  controller.abort();
  const cleanup = jest.fn(async () => ({ removed: 0 }));
  await expect(
    createDemoCleanupHandler(cleanup)({ ...context(), signal: controller.signal }),
  ).rejects.toThrow();
  expect(cleanup).not.toHaveBeenCalled();
  await expect(
    createDemoCleanupHandler(async () => {
      throw new Error('unsafe');
    })(context()),
  ).rejects.toThrow('unsafe');
});
