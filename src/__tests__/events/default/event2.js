export default {
    name: "uncaughtException",
    isOnce: false,
    execute: async function (err) {
        console.error("uncaughtException:", err);
    },
};
