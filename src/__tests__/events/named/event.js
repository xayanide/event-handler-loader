export const eventHandler = {
    name: "unhandledRejection",
    isOnce: true,
    execute: async function (err) {
        console.error("unhandledRejection:", err);
    },
};
