import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts de skills de terceros instaladas en .agents/skills — no son
    // parte del código de la app, no hace falta lintearlas con las reglas
    // de este proyecto.
    ".agents/**",
  ]),
]);

export default eslintConfig;
