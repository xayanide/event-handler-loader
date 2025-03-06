export default {
    name: "testEvent",
    execute: function (prependedArg1, prependedArg2, prependedArg3, emittedArg1, emittedarg2) {
        console.log("prependedArg1:", prependedArg1);
        console.log("prependedArg2:", prependedArg2);
        console.log("prependedArg3:", prependedArg3);
        console.log("emittedArg1:", emittedArg1);
        console.log("emittedarg2:", emittedarg2);
    },
};
