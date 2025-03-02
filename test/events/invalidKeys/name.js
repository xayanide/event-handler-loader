export const eventHandler = {
    namea: "unhandledRejection",
    isOnce: false,
    isPrepend: false,
    execute: async function (err) {
        console.error("unhandledRejection:", err);
    },
};
