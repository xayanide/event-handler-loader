export const eventHandler = {
    name: "unhandledRejection",
    isOnce: false,
    isPrepend: false,
    executea: async function (err) {
        console.error("unhandledRejection:", err);
    },
};
