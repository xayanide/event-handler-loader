export const eventHandler = {
    name: "unhandledRejection",
    isOnce: true,
    isPrependa: false,
    execute: async function (err) {
        console.error("unhandledRejection:", err);
    },
};
