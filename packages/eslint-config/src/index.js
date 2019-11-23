module.exports = {
  extends: ["prettier", "prettier/react"],
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
    "no-trailing-spaces": [
      "error",
      {
        ignoreComments: true,
      },
    ],
    "no-underscore-dangle": [
      "error",
      {
        allow: ["_id", "__REDUX_DEVTOOLS_EXTENSION_COMPOSE__"],
        allowAfterThis: true,
      },
    ],
    "no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "_",
        varsIgnorePattern: "_",
      },
    ],
    "prefer-template": "off",
    quotes: ["error", "double", { avoidEscape: true }],
    strict: "off",
  },
};
