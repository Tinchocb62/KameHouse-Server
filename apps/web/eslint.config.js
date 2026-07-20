import reactPlugin from "eslint-plugin-react"
import reactHooksPlugin from "eslint-plugin-react-hooks"
import jsxA11y from "eslint-plugin-jsx-a11y"
import tseslint from "typescript-eslint"
import globals from "globals"
import reactCompiler from "eslint-plugin-react-compiler"

export default tseslint.config(
    {
        ignores: [
            "out/**",
            "node_modules/**",
            "src/api/generated/**",
            "src/routeTree.gen.ts",
            ".storybook/**",
        ],
    },
    // Avoid js.configs.recommended because it contains a typo in v9.10.0 (no-unassigned-vars)
    ...tseslint.configs.recommended,
    {
        files: ["src/**/*.{ts,tsx}"],
        plugins: {
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
            "jsx-a11y": jsxA11y,
            "react-compiler": reactCompiler,
        },
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2021,
            },
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                ecmaFeatures: { jsx: true },
            },
        },
        settings: {
            react: { version: "detect" },
        },
        rules: {
            // Manually selected core rules (since we're skipping js.configs.recommended)
            "constructor-super": "error",
            "no-const-assign": "error",
            "no-dupe-args": "error",
            "no-dupe-class-members": "error",
            "no-dupe-keys": "error",
            "no-func-assign": "error",
            "no-import-assign": "error",
            "no-obj-calls": "error",
            "no-setter-return": "error",
            "no-this-before-super": "error",
            "no-undef": "off", // Handled by TS
            "no-unreachable": "warn",
            "no-unused-vars": "off", // Handled by @typescript-eslint

            // React
            ...reactPlugin.configs.recommended.rules,
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",

            // React Hooks
            ...reactHooksPlugin.configs.recommended.rules,
            "react-hooks/preserve-manual-memoization": "warn",
            "react-hooks/set-state-in-effect": "warn",
            "react-hooks/refs": "warn",
            "react-hooks/rules-of-hooks": "error",

            // Accessibility
            "jsx-a11y/alt-text": "warn",
            "jsx-a11y/label-has-associated-control": "warn",

            // TypeScript
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
                ignoreRestSiblings: true,
            }],
            "@typescript-eslint/ban-ts-comment": "warn",

            // React Compiler
            "react-compiler/react-compiler": "warn",
        },
    },
)
