import { parseJobArguments } from './arguments';

test.each([[], ['help'], ['--help'], ['-h']].map((args) => [args]))(
  'help can be requested without database configuration: %j',
  (args) => {
    expect(parseJobArguments(args)).toEqual(['help']);
  },
);
test.each(
  [
    ['setup', 'billing_reconciliation'],
    ['enqueue', 'billing_reconciliation', 'request-1'],
    ['scheduler', '20'],
    ['worker', '1'],
    ['list', '0', '50'],
    ['schedules'],
    ['inspect', 'b1111111-1111-4111-8111-111111111111'],
    ['findings', 'b1111111-1111-4111-8111-111111111111', '20', '10'],
  ].map((args) => [args]),
)('accepts supported commands: %j', (args) => {
  expect(parseJobArguments(args)[0]).toBe(args[0]);
});
test.each(
  [
    ['setup', 'unknown'],
    ['enable', 'bad'],
    ['worker', '0'],
    ['worker', '101'],
    ['worker', '1.5'],
    ['scheduler', '10', 'extra'],
    ['list', '-1'],
    ['findings', 'bad'],
    ['enqueue', 'billing_reconciliation', ' '],
    ['interval', '3600'],
    ['help', 'extra'],
    ['worker', 'Infinity'],
  ].map((args) => [args]),
)('rejects invalid commands without echoing user input: %j', (args) => {
  expect(() => parseJobArguments(args)).toThrow('Invalid jobs command.');
});
