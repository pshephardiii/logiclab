import { readBillingConfig } from './billing';

test('billing is disabled by default', () => {
  expect(readBillingConfig({})).toBeNull();
  expect(readBillingConfig({ BILLING_ENABLED: 'false' })).toBeNull();
});

test('enabled simulator requires a dedicated signing key without printing its value', () => {
  const secret = 'ab'.repeat(32);
  expect(
    readBillingConfig({ BILLING_ENABLED: 'true', BILLING_SIMULATOR_SIGNING_SECRET: secret }),
  ).toEqual({ signingSecret: secret });
  for (const value of [undefined, 'REPLACE_ME', 'g'.repeat(64)]) {
    expect(() =>
      readBillingConfig({ BILLING_ENABLED: 'true', BILLING_SIMULATOR_SIGNING_SECRET: value }),
    ).toThrow('BILLING_SIMULATOR_SIGNING_SECRET');
  }
  expect(() => readBillingConfig({ BILLING_ENABLED: 'yes' })).toThrow();
});
