/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
export default {
    /** Defaulted settings: */
    trailingComma: "all",
    semi: true,
    singleQuote: false,
    endOfLine: "lf",
    useTabs: false,
    arrowParens: "always",
    bracketSpacing: true,
    objectWrap: "preserve",
    /** Preferenced settings: */
    /**
    My PrintWidth Preferences:
    Any Screen with VS Code Zoom Level Any: 80
    1080p Screen with VS Code Zoom Level 0: 211
    1080p Screen with VS Code Zoom Level 1: 172
    */
    parser: "typescript",
    printWidth: 172,
    tabWidth: 4,
    quoteProps: "consistent",
    experimentalTernaries: true,
};
