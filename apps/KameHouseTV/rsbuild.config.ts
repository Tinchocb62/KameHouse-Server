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
    // Samsung TV 2021 (Tizen 6.0) corre Chromium M76: sin esto rsbuild asume
    // Chrome >= 87 y deja sintaxis ES2020 (p.ej. optional chaining) sin
    // transpilar, lo que rompe la app entera en la TV con un SyntaxError.
    // Referencia motor/modelo: Tizen 5.5 (2020)=M69, 6.0 (2021)=M76, 6.5 (2022)=M85.
    overrideBrowserslist: ['chrome >= 76'],
  },
});
