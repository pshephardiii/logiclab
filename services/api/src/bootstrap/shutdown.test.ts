import { createShutdownHandler, API_SHUTDOWN_TIMEOUT_MS } from './shutdown';

afterEach(() => jest.useRealTimers());
function fixture(close = jest.fn<Promise<void>, []>().mockResolvedValue(undefined)) {
  const onError = jest.fn();
  const onTimeout = jest.fn();
  const forceExit = jest.fn();
  return {
    close,
    onError,
    onTimeout,
    forceExit,
    shutdown: createShutdownHandler({ close, onError, onTimeout, forceExit }),
  };
}

test('repeated signals share one cleanup and do not extend the shutdown deadline', async () => {
  jest.useFakeTimers();
  const state = fixture(jest.fn(() => new Promise<void>(() => {})));
  state.shutdown();
  await jest.advanceTimersByTimeAsync(API_SHUTDOWN_TIMEOUT_MS - 1);
  state.shutdown();
  expect(state.close).toHaveBeenCalledTimes(1);
  expect(state.forceExit).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  expect(state.onTimeout).toHaveBeenCalledTimes(1);
  expect(state.forceExit).toHaveBeenCalledTimes(1);
  expect(state.forceExit).toHaveBeenCalledWith(1);
});

test('successful cleanup does not force an immediate exit', async () => {
  jest.useFakeTimers();
  const state = fixture();
  state.shutdown();
  await jest.advanceTimersByTimeAsync(0);
  expect(state.close).toHaveBeenCalledTimes(1);
  expect(state.onError).not.toHaveBeenCalled();
  expect(state.forceExit).not.toHaveBeenCalled();
});

test('the deadline remains available for handles left open after successful cleanup', async () => {
  jest.useFakeTimers();
  const state = fixture();
  state.shutdown();
  await jest.advanceTimersByTimeAsync(API_SHUTDOWN_TIMEOUT_MS);
  expect(state.forceExit).toHaveBeenCalledTimes(1);
  expect(state.forceExit).toHaveBeenCalledWith(1);
});

test('failed cleanup reports a sanitized error and remains bounded', async () => {
  jest.useFakeTimers();
  const state = fixture(
    jest.fn<Promise<void>, []>().mockRejectedValue(new Error('Private connection detail')),
  );
  state.shutdown();
  await jest.advanceTimersByTimeAsync(0);
  expect(state.onError).toHaveBeenCalledTimes(1);
  expect(state.onError).toHaveBeenCalledWith();
  expect(state.forceExit).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(API_SHUTDOWN_TIMEOUT_MS);
  expect(state.forceExit).toHaveBeenCalledTimes(1);
  expect(state.forceExit).toHaveBeenCalledWith(1);
});
