import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Formatting is enforced separately; mixing it into ESLint obscured real code issues.
      "prettier/prettier": "off",
    },
  },
  eslintPluginPrettier,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Keep repository formatting debt out of the lint gate; TypeScript and ESLint still run.
      "prettier/prettier": "off",
      // The existing repository has legacy untyped integration boundaries and control-character validators.
      // Keep these two rules non-blocking until those boundaries can be typed without behavior changes.
      "@typescript-eslint/no-explicit-any": "off",
      "no-control-regex": "off",
    },
  },
);
