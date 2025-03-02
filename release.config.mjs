/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
    tagFormat: "${version}",
    branches: [
        { name: "main", prerelease: false },
        { name: "dev", prerelease: true }
    ],
    plugins: [
        ["@semantic-release/commit-analyzer"],
        ["@semantic-release/release-notes-generator"],
        [
            "@semantic-release/npm",
            {
                npmPublish: false,
            },
        ],
        ["@semantic-release/github"],
        [
            "@semantic-release/git",
            {
                assets: ["package.json", "package-lock.json"],
                message: "chore(release): ${nextRelease.version}\n\n${nextRelease.notes}",
            },
        ],
    ],
};
