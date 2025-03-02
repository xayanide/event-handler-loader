export const one = {
    name: "multiHandlerEvent",
    isOnce: true,
    execute: function () {
        console.log("I only execute once.");
    },
};

export const two = {
    name: "multiHandlerEvent",
    isOnce: true,
    execute: async function () {
        console.log("I only execute once.");
    },
};
