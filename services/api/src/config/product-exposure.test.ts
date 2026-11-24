import { ProductExposure } from '@logiclab/contracts/product-exposure';
import { readProductExposureConfig } from './product-exposure';

test.each([undefined, 'development', 'test'])(
  'defaults to full only outside production: %s',
  (NODE_ENV) => {
    expect(readProductExposureConfig({ NODE_ENV })).toBe(ProductExposure.Full);
  },
);

test.each(Object.values(ProductExposure))(
  'accepts the explicit %s choice in local and production environments',
  (PRODUCT_EXPOSURE) => {
    for (const NODE_ENV of ['development', 'production'])
      expect(readProductExposureConfig({ NODE_ENV, PRODUCT_EXPOSURE })).toBe(PRODUCT_EXPOSURE);
  },
);

test('production requires an explicit choice without inferring from auth/demo/billing flags', () => {
  expect(() =>
    readProductExposureConfig({
      NODE_ENV: 'production',
      AUTH_ENABLED: 'false',
      DEMO_ENABLED: 'false',
      BILLING_ENABLED: 'false',
    }),
  ).toThrow(/PRODUCT_EXPOSURE must be explicitly set/);
});

test.each(['prod', 'staging', ''])(
  'rejects an unrecognized NODE_ENV instead of assuming local mode: %s',
  (NODE_ENV) => {
    expect(() => readProductExposureConfig({ NODE_ENV })).toThrow(/NODE_ENV/);
  },
);

test('configuration errors identify the setting without printing its supplied value', () => {
  const privateValue = 'PRIVATE_CONFIG_VALUE';
  try {
    readProductExposureConfig({ PRODUCT_EXPOSURE: privateValue });
    throw new Error('Expected rejection');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('PRODUCT_EXPOSURE');
    expect((error as Error).message).not.toContain(privateValue);
  }
});
