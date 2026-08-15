import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/graphify-out/**",
      "node_modules/**"
    ]
  }
);
