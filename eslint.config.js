import globals from "globals";
import eslintPluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import stylisticEslintPlugin from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";

const stylisticFormattingRules = {
    "@stylistic/no-trailing-spaces": ["error", { skipBlankLines: false, ignoreComments: true }],
    "@stylistic/arrow-spacing": ["error", { before: true, after: true }],
    "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: true }],
    "@stylistic/comma-dangle": ["error", "always-multiline"],
    "@stylistic/comma-style": ["error", "last"],
    "@stylistic/no-floating-decimal": "error",
    "@stylistic/quotes": ["error", "double", { allowTemplateLiterals: false }],
    "@stylistic/indent": ["error", 4, { SwitchCase: 1, tabLength: 4 }],
    "@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0, maxBOF: 0 }],
    "@stylistic/multiline-comment-style": ["error", "bare-block"],
};

const eslintFormattingRules = { "arrow-body-style": ["error", "always"], "curly": ["error", "all"], "no-inline-comments": "error" };

const eslintCodeQualityRules = {
    "func-style": ["off", "declaration", { overrides: { namedExports: "ignore" } }],
    "no-console": "off",
    "radix": ["error", "always"],
    "no-shadow": ["error", { builtinGlobals: true, hoist: "all", allow: [], ignoreOnInitialization: true }],
    "no-negated-condition": "error",
    "no-unneeded-ternary": ["error", { defaultAssignment: true }],
    "no-nested-ternary": "error",
    "no-var": "error",
    "no-use-before-define": ["error", { functions: false, classes: true, variables: true, allowNamedExports: false }],
    "prefer-const": ["error", { destructuring: "any", ignoreReadBeforeAssign: false }],
    "require-await": "error",
    "strict": ["error", "global"],
    "yoda": "error",
};

/**
 * @see https://eslint.org/docs/latest/rules
 * @see https://eslint.org/docs/latest/use/configure
 * @type {import('eslint').Linter.Config[]}
 */
export default tseslint.config(
    eslintPluginJs.configs.recommended,
    tseslint.configs.recommended,
    eslintConfigPrettier,
    {
        name: "xayanide/personal",
        files: ["**/*.js"],
        languageOptions: { sourceType: "module", globals: { ...globals.node, ...globals.es2025, ...globals.browser } },
        plugins: { "@stylistic": stylisticEslintPlugin },
        rules: { ...stylisticFormattingRules, ...eslintFormattingRules, ...eslintCodeQualityRules },
    },
    /**
    Global ignores:
    https://eslint.org/docs/latest/use/configure/configuration-files#globally-ignoring-files-with-ignores
    https://github.com/eslint/eslint/discussions/18304#discussioncomment-9069706
    */
    { ignores: ["**/node_modules/", "**/.git/", "**/logs/", "**/dist/", "**/sandbox/"] },
);
