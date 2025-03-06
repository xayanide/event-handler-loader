export const one = {
    name: "multiHandlerEvent",
    isOnce: false,
    execute: function () {
        console.error("multiHandlerEvent:");
    },
};

export const two = {
    name: "multiHandlerEvent",
    isOnce: false,
    execute: async function () {
        console.error("multiHandlerEvent:");
    },
};

export const three = {
    name: "multiHandlerEvent",
    isOnce: false,
    execute: function () {
        console.error("multiHandlerEvent:");
    },
};
