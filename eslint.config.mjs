import { readdirSync } from "node:fs";
import nextConfig from "eslint-config-next";

const featureNames = readdirSync(new URL("./features/", import.meta.url), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const eslintConfig = [
  {
    ignores: [
      "dist/**",
      ".cloudflare/**",
      ".vinext/**",
      ".wrangler/**",
      ".next/**",
      "next-env.d.ts",
      "worker-configuration.d.ts",
    ],
  },
  ...nextConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
  {
    files: [
      "components/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
      "config/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "@/features/**"],
              message:
                "Shared modules must not depend on routes or individual features. Move genuinely shared code into components, hooks, lib, or config.",
            },
          ],
        },
      ],
    },
  },
  ...featureNames.map((feature) => ({
    files: [`features/${feature}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/app/**",
                ...featureNames
                  .filter((name) => name !== feature)
                  .map((name) => `@/features/${name}/**`),
              ],
              message:
                "Keep features independent. Extract shared behavior to lib, hooks, config, or shared components instead of importing another feature.",
            },
          ],
        },
      ],
    },
  })),
  {
    files: ["components/cummon/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "@/features/**", "@/components/layout/**"],
              message:
                "Common compositions may use UI, hooks, lib, and config; they must not depend on routes, features, or the application shell.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/app/**",
                "@/features/**",
                "@/config/**",
                "@/components/layout/**",
                "@/components/cummon/**",
              ],
              message:
                "UI primitives must remain independent of application layout, tool data, brand, and feature-specific behavior.",
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      "import/no-anonymous-default-export": "off",
    },
  },
];

export default eslintConfig;
