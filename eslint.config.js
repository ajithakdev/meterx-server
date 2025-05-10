import js from "@eslint/js";
import globals from "globals";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["node_modules/", "extension/icons/"],
  },
  // JavaScript - for both extension and server
  {
    files: ["extension/**/*.js", "server/**/*.js"],
    plugins: { js },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off"
    },
    extends: ["js/recommended"]
  },

  // Markdown - for top-level markdown files
  {
    files: ["*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"]
  },

  // CSS - only for popup.css
  {
    files: ["extension/popup/**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: ["css/recommended"]
  }
]);
