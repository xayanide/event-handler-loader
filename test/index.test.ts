import * as nodeEvents from "node:events";
import * as nodePath from "node:path";
import * as nodeUrl from "node:url";
import { jest, describe, beforeEach, afterEach, it, expect } from "@jest/globals";
import { loadEventHandlers } from "../src/index";
import type { EventEmitter } from "node:events";

const eventHandlers = nodePath.join(nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url)), "events");
const invalidKeysDir = nodePath.join(eventHandlers, "invalidKeysDir");
const invalidValuesDir = nodePath.join(eventHandlers, "invalidValues");
const defaultDir = nodePath.join(eventHandlers, "default");
const namedDir = nodePath.join(eventHandlers, "named");
const isOnceDir = nodePath.join(eventHandlers, "isOnce");
const emptyDir = nodePath.join(eventHandlers, "empty");
const asyncDir = nodePath.join(eventHandlers, "async");
const prependDir = nodePath.join(eventHandlers, "prepend");
const nonModuleDir = nodePath.join(eventHandlers, "nonModule");
const textFilePath = nodePath.join(eventHandlers, "event.txt");

describe("event-handler-loader", () => {
    let eventEmitter: EventEmitter;

    beforeEach(() => {
        eventEmitter = new nodeEvents.EventEmitter();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        eventEmitter.removeAllListeners();
    });

    describe("loadEventHandlers()", () => {
        it("load event handlers with parallel mode", async () => {
            await expect(loadEventHandlers(defaultDir, eventEmitter, { importMode: "parallel" })).resolves.toBeTruthy();
            expect(eventEmitter.listenerCount("unhandledRejection")).toBe(1);
        });

        it("load event handlers with sequential mode", async () => {
            await expect(loadEventHandlers(defaultDir, eventEmitter, { importMode: "sequential" })).resolves.toBeTruthy();
            expect(eventEmitter.listenerCount("unhandledRejection")).toBe(1);
        });

        it("load and invoke event handlers with sync or async methods", async () => {
            await expect(loadEventHandlers(asyncDir, eventEmitter, { exportType: "named" })).resolves.toBeTruthy();
            eventEmitter.emit("async");
            eventEmitter.emit("sync");
            expect(eventEmitter.listenerCount("async")).toBe(1);
            expect(eventEmitter.listenerCount("sync")).toBe(1);
        });

        it("load and invoke event handlers prepended", async () => {
            await expect(loadEventHandlers(prependDir, eventEmitter, { exportType: "named" })).resolves.toBeTruthy();
            eventEmitter.emit("async");
            eventEmitter.emit("sync");
        });

        it("load and invoke event handlers with the prepended listener args", async () => {
            await expect(loadEventHandlers(asyncDir, eventEmitter, { exportType: "named", listenerPrependedArgs: ["yum"] })).resolves.toBeTruthy();
            eventEmitter.emit("async");
            eventEmitter.emit("sync");
        });

        it("load all module's named exports that listen the same event", async () => {
            await expect(loadEventHandlers(namedDir, eventEmitter, { exportType: "named", preferredNamedExport: "*" })).resolves.toBeTruthy();
            expect(eventEmitter.listenerCount("multiHandlerEvent")).toBe(3);
        });

        it("load all event handlers with isOnce true, then removes itself after emit", async () => {
            await expect(loadEventHandlers(isOnceDir, eventEmitter, { exportType: "named", preferredNamedExport: "*" })).resolves.toBeTruthy();
            expect(eventEmitter.listenerCount("multiHandlerEvent")).toBe(2);
            eventEmitter.emit("multiHandlerEvent");
            expect(eventEmitter.listenerCount("multiHandlerEvent")).toBe(0);
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
            await expect(loadEventHandlers(namedDir, true as any)).rejects.toThrow();
        });

        it("handle importing named exports with exportType default", async () => {
            await expect(loadEventHandlers(namedDir, eventEmitter)).rejects.toThrow();
        });

        it("handle importing default exports with exportType named", async () => {
            await expect(loadEventHandlers(defaultDir, eventEmitter, { exportType: "named" })).rejects.toThrow();
        });

        it("handle empty strings and non-string loadEventHandlers options", async () => {
            await expect(loadEventHandlers(defaultDir, eventEmitter, { importMode: "" as any })).rejects.toThrow();
            await expect(loadEventHandlers(defaultDir, eventEmitter, { exportType: "" as any })).rejects.toThrow();
            await expect(loadEventHandlers(defaultDir, eventEmitter, { preferredNamedExport: "" as any })).rejects.toThrow();
            await expect(loadEventHandlers(defaultDir, eventEmitter, { importMode: 1 as any })).rejects.toThrow();
            await expect(loadEventHandlers(defaultDir, eventEmitter, { exportType: 1 as any })).rejects.toThrow();
            await expect(loadEventHandlers(defaultDir, eventEmitter, { preferredNamedExport: 1 as any })).rejects.toThrow();
        });

        it("handle empty strings non-string preferredEventHandlerKeys options", async () => {
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { name: "", isOnce: "isOnce", isPrepend: "isPrepend", execute: "execute" } }),
            ).rejects.toThrow();
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { name: "name", isOnce: "", isPrepend: "isPrepend", execute: "execute" } }),
            ).rejects.toThrow();
            loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { name: "name", isOnce: "isOnce", isPrepend: "", execute: "execute" } }),
                await expect(
                    loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { name: "name", isOnce: "isOnce", isPrepend: "isPrepend", execute: "" } }),
                ).rejects.toThrow();
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, {
                    preferredEventHandlerKeys: { name: 1 as any, isOnce: "isOnce", isPrepend: "isPrepend", execute: "execute" },
                }),
            ).rejects.toThrow();
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { name: "name", isOnce: 1 as any, isPrepend: "isPrepend", execute: "execute" } }),
            ).rejects.toThrow();
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { name: "name", isOnce: "isOnce", isPrepend: 1 as any, execute: "execute" } }),
            ).rejects.toThrow();
            await expect(
                loadEventHandlers(defaultDir, eventEmitter, { preferredEventHandlerKeys: { name: "name", isOnce: "isOnce", isPrepend: "isPrepend", execute: 1 as any } }),
            ).rejects.toThrow();
        });

        it("handle invalid event handler keys: name, isOnce, execute. (Should be able to omit isPrepend)", async () => {
            await expect(loadEventHandlers(invalidKeysDir, eventEmitter)).rejects.toThrow();
        });

        it("handle invalid event handler values: string, boolean, function", async () => {
            await expect(loadEventHandlers(invalidValuesDir, eventEmitter, { exportType: "named" })).rejects.toThrow();
        });

        it("handle files that are not js and ts", async () => {
            await expect(loadEventHandlers(nonModuleDir, eventEmitter)).resolves.toBeTruthy();
        });

        it("handle loading preferredNameExport: uniqueEventHandler but has no matches", async () => {
            await expect(loadEventHandlers(namedDir, eventEmitter, { exportType: "named", preferredNamedExport: "uniqueEventHandler" })).rejects.toThrow();
        });

        it("handle loading named exports inside a directory with export default modules", async () => {
            await expect(loadEventHandlers(defaultDir, eventEmitter, { exportType: "named", preferredNamedExport: "*" })).rejects.toThrow();
        });
    });
});
