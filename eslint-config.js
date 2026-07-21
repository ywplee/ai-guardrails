"use strict";

const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const eslintComments = require("eslint-plugin-eslint-comments");

const complexityRules = {
  complexity: ["warn", 15],
  "max-depth": ["warn", 4],
  "max-lines-per-function": ["warn", 100],
};

const typeSafetyRules = {
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/ban-ts-comment": [
    "error",
    { "ts-expect-error": "allow-with-description" },
  ],
};

const noSilentBypassRules = {
  "eslint-comments/no-unlimited-disable": "error",
  "eslint-comments/require-description": "error",
};

const correctnessRules = {
  "no-empty": ["error", { allowEmptyCatch: false }],
  eqeqeq: "error",
  "no-eval": "error",
  "no-new-func": "error",
  "no-implied-eval": "error",
  "require-await": "error",
  "no-async-promise-executor": "error",
  "@typescript-eslint/no-unused-vars": "error",
};

const asyncSafetyRules = {
  "@typescript-eslint/no-floating-promises": "error",
  "@typescript-eslint/no-misused-promises": "error",
};

const coreConfig = {
  files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
  plugins: {
    "@typescript-eslint": tsPlugin,
    "eslint-comments": eslintComments,
  },
  languageOptions: {
    parser: tsParser,
  },
  rules: {
    ...complexityRules,
    ...typeSafetyRules,
    ...noSilentBypassRules,
    ...correctnessRules,
  },
};

const typeAwareConfig = {
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    parserOptions: {
      projectService: true,
    },
  },
  rules: asyncSafetyRules,
};

// Opt-in: only relevant for projects that run on Node. Requires eslint-plugin-n
// to be installed by the consuming project. A getter so requiring this module
// never fails for projects that don't need it.
function nodeRules() {
  return {
    files: ["**/*.{js,ts}"],
    plugins: {
      n: require("eslint-plugin-n"),
    },
    rules: {
      "n/no-deprecated-api": "error",
    },
  };
}

// Opt-in: only relevant for projects using Jest. Requires eslint-plugin-jest
// to be installed by the consuming project.
function jestRules() {
  return {
    files: ["**/*.test.{js,ts,jsx,tsx,mjs,cjs}", "**/*.spec.{js,ts,jsx,tsx,mjs,cjs}"],
    plugins: {
      jest: require("eslint-plugin-jest"),
    },
    rules: {
      "jest/expect-expect": "error",
    },
  };
}

// Opt-in: only relevant for projects using Vitest. Requires @vitest/eslint-plugin
// to be installed by the consuming project.
function vitestRules() {
  return {
    files: ["**/*.test.{js,ts,jsx,tsx,mjs,cjs}", "**/*.spec.{js,ts,jsx,tsx,mjs,cjs}"],
    plugins: {
      vitest: require("@vitest/eslint-plugin"),
    },
    rules: {
      "vitest/expect-expect": "error",
    },
  };
}

module.exports = [coreConfig, typeAwareConfig];
module.exports.coreConfig = coreConfig;
module.exports.typeAwareConfig = typeAwareConfig;
module.exports.nodeRules = nodeRules;
module.exports.jestRules = jestRules;
module.exports.vitestRules = vitestRules;
