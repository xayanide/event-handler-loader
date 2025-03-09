/** From https://github.com/kulshekhar/ts-jest/blob/main/examples/ts-only/jest-esm.config.mjs */
import { createDefaultEsmPreset } from "ts-jest";

/** https://github.com/jestjs/jest/issues/9430 */
/**
Jest uses CommonJS by default but we want ESM.
test.js are files treated as ESM when transform is {} and "type": "module"
test.ts files are treated as ESM when transform is handled by another transformer

jest as a global variable will not be available with ESM, so you gotta use import.meta.jest to access it
until they have proper support with ESM. You can also just import { jest } from "@jest/globals" as well,
but that can trigger a no-shadow error for ESLint, so that rule is disabled for test files.
*/

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    verbose: true,
    detectOpenHandles: true,
    testMatch: ["**/*.test.@(ts|js)"],
    /**
    moduleNameMapper is for errors related to:
    Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'.
    */
    moduleNameMapper: {
        "^(\\.{1,2}/.*/llhttp\\.wasm\\.js)$": "$1",
        "(.+)\\.js": "$1",
    },
    ...createDefaultEsmPreset({
        tsconfig: "./tsconfig.json",
        useESM: true,
    }),
    coverageDirectory: "./coverage",
    testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
