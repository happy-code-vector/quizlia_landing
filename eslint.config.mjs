import coreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "next-env.d.ts"],
  },
  ...coreWebVitals,
  {
    rules: {
      // react-hooks v7 compiler-era rules — new in eslint-config-next 16,
      // flag pre-existing v0-generated patterns; kept as warnings, not errors
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
    },
  },
];

export default eslintConfig;
