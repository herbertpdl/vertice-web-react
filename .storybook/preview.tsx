import type { Preview } from '@storybook/nextjs-vite'
import React from 'react'
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
  decorators: [
    (Story) => (
      <div
        className="font-base antialiased bg-[var(--color-bg)] text-[color:var(--color-text-primary)] p-6"
        style={
          {
            '--font-inter': 'Inter',
            '--font-space-grotesk': 'Space Grotesk',
          } as React.CSSProperties
        }
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
