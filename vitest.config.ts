import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    projects: [
      {
        // Plain unit tests (no browser): pure modules under src/lib and route handlers under
        // src/app/api (called directly with a Request; tests mock fetch and the session).
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/lib/**/*.test.ts', 'src/app/api/**/*.test.ts'],
        },
        resolve: {
          alias: {
            '@': path.join(dirname, 'src'),
            // Next resolves `server-only` to its own copy at build time; outside Next it would
            // throw, so tests get the no-op version.
            'server-only': path.join(dirname, 'node_modules/next/dist/compiled/server-only/empty.js'),
          },
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
