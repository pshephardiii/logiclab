import { expect, test } from 'vitest';
import { ProductExposure } from '@logiclab/contracts/product-exposure';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readWebProductExposure, loadWebProductExposure } from './product-exposure';

test('local serving defaults to the full product', () => {
  expect(readWebProductExposure({}, 'serve')).toBe(ProductExposure.Full);
});

test.each(Object.values(ProductExposure))(
  'both commands accept an explicit %s choice',
  (PRODUCT_EXPOSURE) => {
    for (const command of ['serve', 'build'] as const)
      expect(readWebProductExposure({ PRODUCT_EXPOSURE }, command)).toBe(PRODUCT_EXPOSURE);
  },
);

test('every build requires a choice, independently of a Vite mode name', () => {
  expect(() => readWebProductExposure({}, 'build')).toThrow(
    /PRODUCT_EXPOSURE must be explicitly set/,
  );
});

test.each(['', 'FULL', 'practice', null])(
  'invalid explicit %p mode does not enable the full product',
  (PRODUCT_EXPOSURE) => {
    for (const command of ['serve', 'build'] as const)
      expect(() => readWebProductExposure({ PRODUCT_EXPOSURE }, command)).toThrow(
        /PRODUCT_EXPOSURE/,
      );
  },
);

test('root file and shell use Node env parsing/precedence without exposing other settings', () => {
  const directory = mkdtempSync(join(tmpdir(), 'logiclab-exposure-'));
  const file = pathToFileURL(join(directory, '.env'));

  try {
    writeFileSync(
      file,
      'PRODUCT_EXPOSURE="practice-only" # shared setting\nPRIVATE_SENTINEL=not-public\nVITE_PRODUCT_EXPOSURE=full\n',
    );
    expect(loadWebProductExposure(file, 'build', {})).toBe(ProductExposure.PracticeOnly);
    expect(loadWebProductExposure(file, 'build', { PRODUCT_EXPOSURE: 'full' })).toBe(
      ProductExposure.Full,
    );
    expect(() => loadWebProductExposure(file, 'serve', { PRODUCT_EXPOSURE: '' })).toThrow(
      /PRODUCT_EXPOSURE/,
    );
    writeFileSync(file, 'VITE_PRODUCT_EXPOSURE=full\n');
    expect(() => loadWebProductExposure(file, 'build', {})).toThrow(
      /PRODUCT_EXPOSURE must be explicitly set/,
    );
    expect(loadWebProductExposure(file, 'serve', {})).toBe(ProductExposure.Full);
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test('missing root file preserves local defaults and requires an explicit build choice', () => {
  const directory = mkdtempSync(join(tmpdir(), 'logiclab-exposure-'));

  try {
    const file = pathToFileURL(join(directory, 'missing.env'));
    expect(loadWebProductExposure(file, 'serve', {})).toBe(ProductExposure.Full);
    expect(() => loadWebProductExposure(file, 'build', {})).toThrow(/PRODUCT_EXPOSURE/);
    expect(loadWebProductExposure(file, 'build', { PRODUCT_EXPOSURE: 'practice-only' })).toBe(
      ProductExposure.PracticeOnly,
    );
  } finally {
    rmSync(directory, { recursive: true });
  }
});
