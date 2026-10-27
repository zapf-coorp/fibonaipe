import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

const purityBan = {
  files: ["packages/domain/src/**/*.ts", "packages/application/src/**/*.ts"],
  ignores: ["**/*.test.ts", "**/__tests__/**"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
        message: "Date.now() is forbidden in domain and application. Inject Clock.",
      },
      {
        selector: "NewExpression[callee.name='Date'][arguments.length=0]",
        message: "new Date() is forbidden in domain and application. Inject Clock.",
      },
      {
        selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
        message: "Math.random() is forbidden in domain and application.",
      },
      {
        selector: "CallExpression[callee.object.name='crypto'][callee.property.name='randomUUID']",
        message: "crypto.randomUUID() is forbidden in domain and application.",
      },
      {
        selector: "MemberExpression[object.name='process'][property.name='env']",
        message: "process.env is forbidden in domain and application.",
      },
    ],
  },
};

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "tools/boundary-fixtures/**",
      "node_modules/**",
      ".docs/**",
      ".zteam/**",
      ".brainstorm/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  purityBan,
  {
    files: ["tools/**/*.mjs"],
    languageOptions: { sourceType: "module", globals: { console: "readonly", process: "readonly" } },
  },
);
