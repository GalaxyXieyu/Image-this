import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: join(__dirname, ".."),
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "dist/**",
      "dist-electron/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "design_handoff/**",
      "应用页面完整盘点/**"
    ]
  },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "ignoreRestSiblings": true }],
      "react-hooks/exhaustive-deps": "warn",
      "jsx-a11y/alt-text": "warn"
    }
  }
];

export default eslintConfig;
