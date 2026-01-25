const js = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");

module.exports = [
  js.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Allow 'any' type for tools parameter (generic MCP tools)
      "@typescript-eslint/no-explicit-any": "off",
      // Allow schemas that are only used for type inference
      // Allow variables prefixed with _ (intentionally unused)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^(_.*|.*Schema)$",
        },
      ],
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "**/*.js"],
  },
];
