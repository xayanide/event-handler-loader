import * as nodeEvents from "node:events";
import * as nodePath from "node:path";
import * as nodeUrl from "node:url";
import { jest, describe, beforeEach, afterEach, it, expect } from "@jest/globals";
import { loadEventHandlers } from "../index.js";
import type { EventEmitter } from "node:events";

const eventHandlers = nodePath.join(nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url)), "events");
const invalidKeysDir = nodePath.join(eventHandlers, "invalidKeys");
const invalidValuesDir = nodePath.join(eventHandlers, "invalidValues");
const defaultDir = nodePath.join(eventHandlers, "default");
const namedDir = nodePath.join(eventHandlers, "named");
const isOnceDir = nodePath.join(eventHandlers, "isOnce");
const allDir = nodePath.join(eventHandlers, "all");
const allInvalidDir = nodePath.join(eventHandlers, "allInvalid");
const emptyDir = nodePath.join(eventHandlers, "empty");
const asyncDir = nodePath.join(eventHandlers, "async");
const prependArgsDir = nodePath.join(eventHandlers, "prependArgs");
const prependDir = nodePath.join(eventHandlers, "prepend");
const nonModuleDir = nodePath.join(eventHandlers, "nonModule");
const textFilePath = nodePath.join(eventHandlers, "event.txt");

describe("event-handler-loader", () => {
    let eventEmitter: EventEmitter;

    beforeEach(() => {
        eventEmitter = new nodeEvents.EventEmitter();
        jest.spyOn(console, "log").mockImplementation(() => {
            return undefined;
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        eventEmitter.removeAllListeners();
    });

    describe("loadEventHandlers()", () => {
        it("load, emit and pass listenerPrependedArgs and emitted event args correctly", async () => {
            const listenerPrependedArgs = [1, "arg2", { arg3: 1 }];
            await loadEventHandlers(prependArgsDir, eventEmitter, {
                listenerPrependedArgs,
            });
            eventEmitter.emit("testEvent", "eventArg1", "eventArg2");
            expect(console.log).toHaveBeenCalledWith("prependedArg1:", 1);
            expect(console.log).toHaveBeenCalledWith("prependedArg2:", "arg2");
            expect(console.log).toHaveBeenCalledWith("prependedArg3:", { arg3: 1 });
            expect(console.log).toHaveBeenCalledWith("emittedArg1:", "eventArg1");
            expect(console.log).toHaveBeenCalledWith("emittedarg2:", "eventArg2");
        });

        it("load event handlers with concurrent mode", async () => {
            await expect(loadEventHandlers(defaultDir, eventEmitter, { isConcurrent: true })).resolves.toBeUndefined();
            expect(eventEmitter.listenerCount("unhandledRejection")).toBe(1);
        });

        it("load event handlers with sequential mode", async () => {
            await expect(loadEventHandlers(defaultDir, eventEmitter, { isConcurrent: false })).resolves.toBeUndefined();
            expect(eventEmitter.listenerCount("unhandledRejection")).toBe(1);
        });

        it("load event handlers with sequential mode and overriden callback sync and async ", async () => {
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { isConcurrent: false }, function (emitter, moduleExport, fileUrlHref, listenerPrependedArgs) {
                    expect(emitter).toBeInstanceOf(nodeEvents.EventEmitter);
                    expect(typeof moduleExport === "object").toBeTruthy();
                    expect(typeof fileUrlHref === "string").toBeTruthy();
                    expect(listenerPrependedArgs.length).toBe(0);
                }),
            ).resolves.toBeUndefined();
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { isConcurrent: false }, async function (emitter, moduleExport, fileUrlHref, listenerPrependedArgs) {
                    expect(emitter).toBeInstanceOf(nodeEvents.EventEmitter);
                    expect(typeof moduleExport === "object").toBeTruthy();
                    expect(typeof fileUrlHref === "string").toBeTruthy();
                    expect(listenerPrependedArgs.length).toBe(0);
                    await new Promise<void>(function (resolve) {
                        resolve();
                    });
                }),
            ).resolves.toBeUndefined();
            expect(eventEmitter.listenerCount("unhandledRejection")).toBe(0);
        });

        it("load event handlers with sequential mode and recursively looks inside that path", async () => {
            await expect(loadEventHandlers(defaultDir, eventEmitter, { isConcurrent: false, isRecursive: true })).resolves.toBeUndefined();
            expect(eventEmitter.listenerCount("unhandledRejection")).toBe(3);
        });

        it("load and invoke event handlers with sync or async methods", async () => {
            await expect(loadEventHandlers(asyncDir, eventEmitter, { exportType: "named" })).resolves.toBeUndefined();
            eventEmitter.emit("async");
            eventEmitter.emit("sync");
            expect(eventEmitter.listenerCount("async")).toBe(1);
            expect(eventEmitter.listenerCount("sync")).toBe(1);
        });

        it("load and invoke event handlers prepended", async () => {
            await expect(loadEventHandlers(prependDir, eventEmitter, { exportType: "named" })).resolves.toBeUndefined();
            eventEmitter.emit("async");
            eventEmitter.emit("sync");
        });

        it("load and invoke event handlers with the prepended listener args", async () => {
            await expect(loadEventHandlers(asyncDir, eventEmitter, { exportType: "named", listenerPrependedArgs: ["yum"] })).resolves.toBeUndefined();
            eventEmitter.emit("async");
            eventEmitter.emit("sync");
        });

        it("load all module's named exports that listen the same event", async () => {
            await expect(loadEventHandlers(namedDir, eventEmitter, { exportType: "named", preferredExportName: "*" })).resolves.toBeUndefined();
            expect(eventEmitter.listenerCount("multiHandlerEvent")).toBe(3);
        });

        it("load all event handlers with isOnce true, then removes itself after emit", async () => {
            await expect(loadEventHandlers(isOnceDir, eventEmitter, { exportType: "named", preferredExportName: "*" })).resolves.toBeUndefined();
            expect(eventEmitter.listenerCount("multiHandlerEvent")).toBe(2);
            eventEmitter.emit("multiHandlerEvent");
            expect(eventEmitter.listenerCount("multiHandlerEvent")).toBe(0);
        });

        it("load event handlers with omitted options", async () => {
            await expect(loadEventHandlers(defaultDir, eventEmitter, {})).resolves.toBeUndefined();
            expect(eventEmitter.listenerCount("unhandledRejection")).toBe(1);
        });

        it("load event handlers with specifically ommited preferredEventHandlerKeys", async () => {
            // Omit name
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { isOnce: "isOnce", isPrepend: "isPrepend", execute: "execute" } }),
            ).resolves.toBeUndefined();
            // Omit isOnce
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { name: "name", isPrepend: "isPrepend", execute: "execute" } }),
            ).resolves.toBeUndefined();
            // Omit isPrepend
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { name: "name", isOnce: "isOnce", execute: "execute" } }),
            ).resolves.toBeUndefined();
            // Omit execute
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { name: "name", isOnce: "isOnce", isPrepend: "isPrepend" } }),
            ).resolves.toBeUndefined();
        });

        it("load default and named exports with exportType all", async () => {
            await expect(loadEventHandlers(allDir, eventEmitter, { exportType: "all" })).resolves.toBeUndefined();
        });

        it("handle not finding any default and named exports with exportType all", async () => {
            await expect(loadEventHandlers(allInvalidDir, eventEmitter, { exportType: "all" })).resolves.toBeUndefined();
        });

        it("handle invalid directories", async () => {
            await expect(loadEventHandlers("/aaaaaaaaaaaaa", eventEmitter)).rejects.toThrow();
        });

        it("handle empty directories", async () => {
            await expect(loadEventHandlers(emptyDir, eventEmitter)).rejects.toThrow();
        });

        it("handle file paths", async () => {
            await expect(loadEventHandlers(textFilePath, eventEmitter)).rejects.toThrow();
        });

        it("handle non-EventEmitter instances", async () => {
            await expect(loadEventHandlers(namedDir, true as unknown as EventEmitter)).rejects.toThrow();
        });

        it("handle importing named exports with exportType default", async () => {
            await expect(loadEventHandlers(namedDir, eventEmitter)).rejects.toThrow();
        });

        it("handle importing named exports with exportType named and preferredExportName default", async () => {
            await expect(loadEventHandlers(namedDir, eventEmitter, { exportType: "named", preferredExportName: "default" })).rejects.toThrow();
        });

        it("handle importing default exports with exportType named", async () => {
            await expect(loadEventHandlers(defaultDir, eventEmitter, { exportType: "named" })).rejects.toThrow();
        });

        it("handle empty strings and non-string loadEventHandlers options", async () => {
            await expect(loadEventHandlers(defaultDir, eventEmitter, { isConcurrent: "" as unknown as boolean })).rejects.toThrow();
            await expect(loadEventHandlers(defaultDir, eventEmitter, { exportType: "" as "default" })).rejects.toThrow();
            await expect(loadEventHandlers(defaultDir, eventEmitter, { preferredExportName: "" })).rejects.toThrow();
            await expect(loadEventHandlers(defaultDir, eventEmitter, { isRecursive: "" as unknown as boolean })).rejects.toThrow();
            await expect(loadEventHandlers(defaultDir, eventEmitter, { isConcurrent: 1 as unknown as boolean })).rejects.toThrow();
            await expect(loadEventHandlers(defaultDir, eventEmitter, { exportType: 1 as unknown as "default" })).rejects.toThrow();
            await expect(loadEventHandlers(defaultDir, eventEmitter, { preferredExportName: 1 as unknown as "" })).rejects.toThrow();
        });

        it("handle empty strings non-string preferredEventHandlerKeys options", async () => {
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { name: "", isOnce: "isOnce", isPrepend: "isPrepend", execute: "execute" } }),
            ).rejects.toThrow();
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { name: "name", isOnce: "", isPrepend: "isPrepend", execute: "execute" } }),
            ).rejects.toThrow();
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { name: "name", isOnce: "isOnce", isPrepend: "", execute: "execute" } }),
            ).rejects.toThrow();
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { name: "name", isOnce: "isOnce", isPrepend: "isPrepend", execute: "" } }),
            ).rejects.toThrow();
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, {
                    preferredEventHandlerKeys: { name: 1 as unknown as string, isOnce: "isOnce", isPrepend: "isPrepend", execute: "execute" },
                }),
            ).rejects.toThrow();
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, {
                    preferredEventHandlerKeys: { name: "name", isOnce: 1 as unknown as string, isPrepend: "isPrepend", execute: "execute" },
                }),
            ).rejects.toThrow();
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, {
                    preferredEventHandlerKeys: { name: "name", isOnce: "isOnce", isPrepend: 1 as unknown as string, execute: "execute" },
                }),
            ).rejects.toThrow();
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, {
                    preferredEventHandlerKeys: { name: "name", isOnce: "isOnce", isPrepend: "isPrepend", execute: 1 as unknown as string },
                }),
            ).rejects.toThrow();
        });

        it("handle invalid event handler options", async () => {
            await expect(loadEventHandlers(isOnceDir, eventEmitter, null as unknown as object)).rejects.toThrow();
            await expect(loadEventHandlers(isOnceDir, eventEmitter, [] as unknown as object)).rejects.toThrow();
        });

        it("handle invalid event handler keys: name, execute. (Should be able to omit isOnce and isPrepend)", async () => {
            await expect(loadEventHandlers(invalidKeysDir, eventEmitter, { exportType: "named" })).rejects.toThrow();
        });

        it("handle invalid event handler values: string, boolean, function", async () => {
            await expect(loadEventHandlers(invalidValuesDir, eventEmitter, { exportType: "named" })).rejects.toThrow();
        });

        it("handle ignoring files that are not modules", async () => {
            await expect(loadEventHandlers(nonModuleDir, eventEmitter)).resolves.toBeUndefined();
        });

        it("handle loading preferredNameExport: uniqueEventHandler but has no matches", async () => {
            await expect(loadEventHandlers(namedDir, eventEmitter, { exportType: "named", preferredExportName: "uniqueEventHandler" })).rejects.toThrow();
        });

        it("handle loading named exports inside a directory with export default modules", async () => {
            await expect(loadEventHandlers(defaultDir, eventEmitter, { exportType: "named", preferredExportName: "*" })).resolves.toBeUndefined();
        });
    });
});
