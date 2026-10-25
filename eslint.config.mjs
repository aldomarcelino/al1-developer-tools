import nextConfig from "eslint-config-next";

const eslintConfig = [
  { ignores: ["dist/**", ".cloudflare/**", ".vinext/**", ".wrangler/**", ".next/**", "next-env.d.ts", "worker-configuration.d.ts"] },
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
    rules: {
      "import/no-anonymous-default-export": "off",
    },
  },
];

export default eslintConfig;
