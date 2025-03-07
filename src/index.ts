import * as nodePath from "node:path";
import * as nodeUrl from "node:url";
import * as nodeFsPromises from "node:fs/promises";
import type { EventEmitter } from "node:events";
import type { PathLike } from "node:fs";
import type { EventExecute, EventHandler, EventHandlerKeys, EventHandlerModule, LoadEventHandlersOptions } from "./types.js";

const EVENT_EMITTER_ADD_LISTENER_METHOD_NAMES = ["on", "once", "addListener", "prependListener", "prependOnceListener"];
const DEFAULT_EXPORT_NAME = "default";
const DEFAULT_EVENT_HANDLER_KEY_NAMES = {
    name: "name",
    isOnce: "isOnce",
    isPrepend: "isPrepend",
    execute: "execute",
};
const DEFAULT_IMPORT_MODE = "parallel";
const DEFAULT_EXPORT_TYPE = "default";
const DEFAULT_NAMED_EXPORT = "eventHandler";
const DEFAULT_IMPORT_MODES = ["parallel", "sequential"];
const DEFAULT_EXPORT_TYPES = ["default", "named"];
const DEFAULT_LOAD_EVENT_HANDLERS_OPTIONS: LoadEventHandlersOptions = {
    importMode: DEFAULT_IMPORT_MODE,
    exportType: DEFAULT_EXPORT_TYPE,
    listenerPrependedArgs: [],
    preferredNamedExport: DEFAULT_NAMED_EXPORT,
    preferredEventHandlerKeys: {},
};

async function isValidDirectory(dirPath: PathLike) {
    try {
        const dirStats = await nodeFsPromises.lstat(dirPath);
        return dirStats.isDirectory();
    } catch {
        return false;
    }
}

function isAsyncFunction(fn: EventExecute) {
    const isFunction = typeof fn === "function";
    if (isFunction) {
        return fn.constructor.name === "AsyncFunction";
    }
    return false;
}

function hasAddListenerMethods(object: EventEmitter): boolean {
    function hasMethod(methodName: string) {
        const method = (object as unknown as Record<string, unknown>)[methodName];
        if (!method || typeof method !== "function") {
            return false;
        }
        return true;
    }
    /** Need a better way instead of duck typing. -xaya */
    return EVENT_EMITTER_ADD_LISTENER_METHOD_NAMES.every(hasMethod);
}

function getMergedListenerArgs(prependedArgs: unknown[], emittedArgs: unknown[]) {
    return prependedArgs.length > 0 ? [...prependedArgs, ...emittedArgs] : emittedArgs;
}

/**
The listenerPrependedArgs option serves as a way to prepend custom values to the arguments
passed to the event handlers' execute() method when an event is emitted.
isAsyncFunction check is used so that 'await' will not promisify normal functions.
I will not use arrow functions or anonymous functions for these.
The function declarations remain named for verbosity and verbose error stack traces.
Note: isAsyncFunction cannot detect if a regular non-async function is async if the regular non-async function returns a Promise.
From what I've read, the only way to detect if a regular function returns a promise is to call it, which is not preferred in this case.
*/
function getAsyncAwareListener(executeMethod: EventExecute, listenerPrependedArgs: unknown[]) {
    if (isAsyncFunction(executeMethod)) {
        async function asyncListener(...listenerEmittedArgs: unknown[]) {
            const listenerArgs = getMergedListenerArgs(listenerPrependedArgs, listenerEmittedArgs);
            return await executeMethod(...listenerArgs);
        }
        return asyncListener;
    } else {
        function syncListener(...listenerEmittedArgs: unknown[]) {
            const listenerArgs = getMergedListenerArgs(listenerPrependedArgs, listenerEmittedArgs);
            return executeMethod(...listenerArgs);
        }
        return syncListener;
    }
}

function bindEventListener(
    eventEmitterLike: EventEmitter,
    eventHandler: EventHandler,
    preferredEventHandlerKeys: EventHandlerKeys,
    listenerPrependedArgs: unknown[],
    fileUrlHref: string,
) {
    const { name: nameKeyName, isOnce: isOnceKeyName, isPrepend: isPrependKeyName, execute: executeKeyName } = preferredEventHandlerKeys;
    if ((nameKeyName as "name") in eventHandler === false) {
        throw new Error(`Unable to find an exported property '${nameKeyName}'. Module: ${fileUrlHref}`);
    }
    if ((executeKeyName as "execute") in eventHandler === false) {
        throw new Error(`Unable to find an exported property '${executeKeyName}'. Module: ${fileUrlHref}`);
    }
    const nameValue = String(eventHandler[nameKeyName as "name"]);
    const isOnceValue = eventHandler[isOnceKeyName as "isOnce"];
    const isPrependValue = eventHandler[isPrependKeyName as "isPrepend"];
    const executeMethod = eventHandler[executeKeyName as "execute"];
    if (!nameValue || (typeof nameValue !== "string" && typeof nameValue !== "symbol")) {
        throw new Error(`Invalid value for key ${nameKeyName}: '${nameValue}'. Must be a non-empty string or symbol. Module: ${fileUrlHref}`);
    }
    if (isOnceValue && typeof isOnceValue !== "boolean") {
        throw new Error(`Invalid value for key ${isOnceKeyName}: '${isOnceValue}'. Must be a boolean. Module: ${fileUrlHref}`);
    }
    if (isPrependValue && typeof isPrependValue !== "boolean") {
        throw new Error(`Invalid value for key ${isPrependKeyName}: '${isPrependValue}'. Must be a boolean. Module: ${fileUrlHref}`);
    }
    if (typeof executeMethod !== "function") {
        throw new Error(`Invalid value for key ${executeKeyName}: '${executeMethod}'. Must be a function. Module: ${fileUrlHref}`);
    }
    const listener = getAsyncAwareListener(executeMethod, listenerPrependedArgs);
    if (isOnceValue) {
        if (isPrependValue) {
            eventEmitterLike.prependOnceListener(nameValue, listener);
            return;
        }
        eventEmitterLike.once(nameValue, listener);
    } else {
        if (isPrependValue) {
            eventEmitterLike.prependListener(nameValue, listener);
            return;
        }
        eventEmitterLike.on(nameValue, listener);
    }
}

async function importEventHandler(fileUrlHref: string, exportType: string, preferredNamedExport: string) {
    const isNamedExportType = exportType === "named";
    const importedModule: EventHandlerModule = await import(fileUrlHref);
    if (isNamedExportType && preferredNamedExport === "*") {
        const eventExports: EventHandler[] = [];
        for (const exportName in importedModule) {
            const eventHandler = importedModule[exportName];
            if (!eventHandler || !Object.prototype.hasOwnProperty.call(importedModule, exportName) || exportName === DEFAULT_EXPORT_NAME) {
                throw new Error(`Invalid event handler module. Must be a named export. Unable to verify named export '${exportName}'. Module: ${fileUrlHref}`);
            }
            eventExports.push(eventHandler);
        }
        return eventExports;
    } else {
        const exportName = isNamedExportType ? preferredNamedExport : DEFAULT_EXPORT_NAME;
        const eventHandler = importedModule[exportName];
        if (!eventHandler || !Object.prototype.hasOwnProperty.call(importedModule, exportName)) {
            throw new Error(
                isNamedExportType
                    ? `Invalid event handler module. Must be a named export. ${
                          exportName === DEFAULT_NAMED_EXPORT ? "Unable to verify named export" : "Unable to verify preferred named export"
                      } '${exportName}'. Module: ${fileUrlHref}`
                    : `Invalid event handler module. Must be a default export. Unable to verify default export '${exportName}'. Module: ${fileUrlHref}`,
            );
        }
        return [eventHandler];
    }
}

async function loadEventHandlers(dirPath: string, eventEmitterLike: EventEmitter, options?: LoadEventHandlersOptions) {
    const isValidDir = await isValidDirectory(dirPath);
    if (!isValidDir) {
        throw new Error("Invalid event handler directory path. Must be an existent directory.");
    }
    if (!hasAddListenerMethods(eventEmitterLike)) {
        throw new Error("Invalid eventEmitterLike instance. Must have EventEmitter methods.");
    }
    const eventHandlerOptions = { ...DEFAULT_LOAD_EVENT_HANDLERS_OPTIONS, ...options };
    const importMode = eventHandlerOptions.importMode;
    const exportType = eventHandlerOptions.exportType;
    const listenerPrependedArgs = eventHandlerOptions.listenerPrependedArgs;
    const preferredNamedExport = eventHandlerOptions.preferredNamedExport;
    const preferredEventHandlerKeys = { ...DEFAULT_EVENT_HANDLER_KEY_NAMES, ...eventHandlerOptions.preferredEventHandlerKeys };
    const { name: nameKeyName, isOnce: isOnceKeyName, isPrepend: isPrependKeyName, execute: executeKeyName } = preferredEventHandlerKeys;
    /** Use 'not' operator to not omit undefined and empty strings passed in options */
    if (!nameKeyName || typeof nameKeyName !== "string") {
        throw new Error(`Invalid value for preferredEventHandlerKeys name: '${nameKeyName}'. Must be a non-empty string.`);
    }
    if (!isOnceKeyName || typeof isOnceKeyName !== "string") {
        throw new Error(`Invalid value for preferredEventHandlerKeys isOnce: '${isOnceKeyName}'. Must be a non-empty string.`);
    }
    if (!isPrependKeyName || typeof isPrependKeyName !== "string") {
        throw new Error(`Invalid value for preferredEventHandlerKeys isPrepend: '${isPrependKeyName}'. Must be a non-empty string.`);
    }
    if (!executeKeyName || typeof executeKeyName !== "string") {
        throw new Error(`Invalid value for preferredEventHandlerKeys execute: '${executeKeyName}'. Must be a non-empty string.`);
    }
    if (!importMode || typeof importMode !== "string" || !DEFAULT_IMPORT_MODES.includes(importMode)) {
        throw new Error(`Invalid import mode: ${importMode}. Must be one of string: ${DEFAULT_IMPORT_MODES.join(", ")}`);
    }
    if (!exportType || typeof exportType !== "string" || !DEFAULT_EXPORT_TYPES.includes(exportType)) {
        throw new Error(`Invalid export type: ${exportType}. Must be one of string: ${DEFAULT_EXPORT_TYPES.join(", ")}`);
    }
    if (!preferredNamedExport || typeof preferredNamedExport !== "string") {
        throw new Error(`Invalid preferred named export: ${preferredNamedExport}. Must be a non-empty string.`);
    }
    const eventHandlerFiles = await nodeFsPromises.readdir(dirPath);
    if (eventHandlerFiles.length === 0) {
        throw new Error(`Invalid event handler files. No event handler files found in directory: ${dirPath}`);
    }
    async function loadEventHandler(file: string) {
        if (!file.endsWith(".js") && !file.endsWith(".ts")) {
            return;
        }
        const filePath = nodePath.join(dirPath, file);
        const fileUrlHref = nodeUrl.pathToFileURL(filePath).href;
        const eventExports = await importEventHandler(fileUrlHref, exportType as string, preferredNamedExport as string);
        for (const eventHandler of eventExports) {
            bindEventListener(eventEmitterLike, eventHandler, preferredEventHandlerKeys, listenerPrependedArgs as unknown[], fileUrlHref);
        }
    }
    if (importMode === "parallel") {
        await Promise.all(eventHandlerFiles.map(loadEventHandler));
    } else {
        for (const file of eventHandlerFiles) {
            await loadEventHandler(file);
        }
    }
    return true;
}

export { loadEventHandlers };
export default loadEventHandlers;
