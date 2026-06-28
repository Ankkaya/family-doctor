import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import globals from "globals";
import tseslint from "typescript-eslint";

const commonIgnores = [
  "**/node_modules/**",
  "**/dist/**",
  "**/coverage/**",
  "**/.vite/**",
  "**/.turbo/**",
  "app/src-tauri/target/**",
  "app/src-tauri/gen/**",
  "app/android/**",
  "backend/generated/**",
];

export default [
  { ignores: commonIgnores },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-console": "off",
      "no-useless-escape": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },
  {
    files: ["app/src/**/*.tsx"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["frontend/src/**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      vue,
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },
];
