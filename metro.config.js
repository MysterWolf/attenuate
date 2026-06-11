// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

// Stub out the DefaultToolLauncher before @react-native/dev-middleware loads it.
// The default launcher auto-opens a Chromium DevTools window on the PC every time
// a device connects, and that window shows disconnect popups when the device drops.
// Returning { code: 'not_implemented' } from prepareDebuggerShell is the no-op
// sentinel recognised by createDevMiddleware's event reporter.
try {
  const launcherPath = require.resolve(
    '@react-native/dev-middleware/dist/utils/DefaultToolLauncher',
    { paths: [__dirname] },
  );
  if (!require.cache[launcherPath]) {
    require.cache[launcherPath] = {
      id:       launcherPath,
      filename: launcherPath,
      loaded:   true,
      exports: {
        default: {
          launchDebuggerAppWindow: async () => {},
          launchDebuggerShell:     async () => {},
          prepareDebuggerShell:    async () => ({ code: 'not_implemented' }),
        },
      },
    };
  }
} catch (_) {}

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
