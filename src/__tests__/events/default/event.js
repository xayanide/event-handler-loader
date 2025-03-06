export default {
    name: "unhandledRejection",
    isOnce: false,
    execute: async function (err) {
        console.error("unhandledRejection:", err);
    },
};
