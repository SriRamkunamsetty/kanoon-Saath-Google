import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * eslint-config-next now ships native ESLint 9 flat configs (plain
 * arrays of config objects) rather than the legacy shareable-config
 * format `FlatCompat` was built to translate — feeding it through
 * `FlatCompat.extends()` anyway throws a circular-JSON error deep in
 * `@eslint/eslintrc`'s validator. Importing the flat configs directly
 * is both the fix and one fewer dependency.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Catches exactly the class of bug that produced ReDoS-style
      // regressions last round: unbounded/backtracking regex literals.
      "no-control-regex": "error",
      "no-misleading-character-class": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: ["playwright-report/**", "test-results/**", ".next/**"],
  },
];

export default eslintConfig;
