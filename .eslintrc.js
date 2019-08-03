module.exports = {
  extends: ["airbnb-base", "prettier"],
  env: {
    browser: true,
    mocha: true,
    node: true,
  },
  rules: {
    "arrow-body-style": "off",
    "comma-dangle": ["error", "always-multiline"],
    "func-names": ["error", "as-needed"],
    "import/no-dynamic-require": "off",
    "import/no-extraneous-dependencies": "off",
    indent: [
      "error",
      2,
      {
        SwitchCase: 1,
      },
    ],
    "linebreak-style": "off",
    "max-len": [
      "warn",
      120,
      {
        ignoreComments: true,
      },
      {
        ignoreTrailingComments: true,
      },
    ],
    "no-console": "off",
    "no-underscore-dangle": [
      "error",
      {
        allow: ["_id"],
      },
    ],
    "no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "_",
        varsIgnorePattern: "_",
      },
    ],
    "no-trailing-spaces": [
      "error",
      {
        ignoreComments: true,
      },
    ],
    "prefer-template": "off",
    quotes: ["error", "double"],
    strict: "off",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
