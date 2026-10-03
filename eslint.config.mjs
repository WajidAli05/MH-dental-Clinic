import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // React Three Fiber scenes mutate three.js objects (materials, uniforms, scene.environment)
  // inside useFrame and effects by design. The compiler's immutability rule cannot tell a
  // scene graph from React state, so it is switched off for the 3D scene files only.
  {
    files: [
      "src/components/hero/HeroScene.tsx",
      "src/components/mouth/MouthScene.tsx",
      "src/components/services/ServiceModels.tsx",
      "src/components/services/Services.tsx",
      "src/components/polish/ToothScene.tsx",
    ],
    rules: { "react-hooks/immutability": "off" },
  },
  // Dev-only render tools (404 in production): same scene-graph mutation, plus a one-time
  // read of the URL query on mount.
  {
    files: ["src/app/lab/**/*.tsx"],
    rules: { "react-hooks/immutability": "off", "react-hooks/set-state-in-effect": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
