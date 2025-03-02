export const eventHandler = {
    name: "unhandledRejection",
    isOncea: false,
    isPrepend: false,
    execute: async function (err) {
        console.error("unhandledRejection:", err);
    },
};
