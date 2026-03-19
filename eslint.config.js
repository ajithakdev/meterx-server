import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["**/node_modules/", "**/dist/", "**/test-files/"],
  },
  // Extension TypeScript - browser globals
  {
    files: ["packages/extension/src/**/*.ts"],
    plugins: { js, "@typescript-eslint": tseslint.plugin },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
        chrome: "readonly",
        performance: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "off"
    },
    extends: ["js/recommended"]
  },
  // Extension build scripts
  {
    files: ["packages/extension/**/*.mjs"],
    plugins: { js },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node }
    },
    extends: ["js/recommended"]
  },
  // Server TypeScript - node globals
  {
    files: ["packages/server/src/**/*.ts"],
    plugins: { js, "@typescript-eslint": tseslint.plugin },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: tseslint.parser,
      globals: { ...globals.node }
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "off"
    },
    extends: ["js/recommended"]
  },
  // Markdown
  {
    files: ["*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"]
  },
  // CSS
  {
    files: ["packages/extension/**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: ["css/recommended"]
  }
]);
