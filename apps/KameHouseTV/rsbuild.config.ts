import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    template: './index.html',
    title: 'KameHouse TV',
  },
  output: {
    distPath: {
      root: 'dist',
    },
    polyfill: 'usage', // Ensure we polyfill for older browsers
    target: 'web',
  },
});
