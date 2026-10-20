import { readDemoConfig } from './demo';

test('demo routes are opt-in and need no Cognito settings', () => {
  expect(readDemoConfig({})).toBeNull();
  expect(readDemoConfig({ DEMO_ENABLED: 'false' })).toBeNull();
  expect(
    readDemoConfig({ DEMO_ENABLED: 'true', APP_ORIGIN: 'http://localhost:5173' }),
  ).toMatchObject({ capacity: 25, secureCookies: false, sessionCookieName: 'logiclab_demo' });
  expect(
    readDemoConfig({
      DEMO_ENABLED: 'true',
      APP_ORIGIN: 'https://demo.example',
      NODE_ENV: 'production',
    })?.secureCookies,
  ).toBe(true);
});
test.each([
  { DEMO_ENABLED: 'yes' },
  { DEMO_ENABLED: 'true', APP_ORIGIN: 'https://demo.example/path' },
  { DEMO_ENABLED: 'true', APP_ORIGIN: 'http://demo.example' },
  { DEMO_ENABLED: 'true', APP_ORIGIN: 'http://localhost:5173', NODE_ENV: 'production' },
  { DEMO_ENABLED: 'true', APP_ORIGIN: 'http://localhost:5173', DEMO_MAX_WORKSPACES: '0' },
  { DEMO_ENABLED: 'true', APP_ORIGIN: 'http://localhost:5173', DEMO_MAX_WORKSPACES: '101' },
])('rejects invalid public demo configuration %j', (env) =>
  expect(() => readDemoConfig(env)).toThrow(),
);
