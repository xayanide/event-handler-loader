/** From https://github.com/kulshekhar/ts-jest/blob/main/examples/ts-only/jest-esm.config.mjs */
import { createDefaultEsmPreset } from "ts-jest";

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    displayName: "event-handler-loader",
    testMatch: ["**/test/**/*.test.ts"],
    ...createDefaultEsmPreset({
        tsconfig: "./tsconfig.json",
        useESM: true,
    }),
    coverageDirectory: "./coverage",
    coveragePathIgnorePatterns: ["node_modules", "test/events"],
};
