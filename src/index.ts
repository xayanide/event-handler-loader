import * as nodePath from "node:path";
import * as nodeFsPromises from "node:fs/promises";
import * as nodeUtilTypes from "node:util/types";
import { getModulePaths, loadModulePaths } from "file-folder-loader";
import type { EventEmitter } from "node:events";
import type { PathLike } from "node:fs";
import type { ExportType, EventExecute, EventHandlerModuleExport, EventHandlerKeys, LoadEventHandlersOptions, BindEventListenerOverride } from "./types.js";

const EVENT_EMITTER_ADD_LISTENER_METHOD_NAMES = ["on", "once", "addListener", "prependListener", "prependOnceListener"];

const DEFAULT_EVENT_HANDLER_KEY_NAMES = {
    name: "name",
    isOnce: "isOnce",
    isPrepend: "isPrepend",
    execute: "execute",
};

const DEFAULT_EXPORT_TYPE = "default";
const DEFAULT_NAMED_EXPORT = "eventHandler";
const DEFAULT_EXPORT_TYPES = ["default", "named", "all"];
const DEFAULT_LOAD_EVENT_HANDLERS_OPTIONS = {
    concurrent: true,
    exportType: DEFAULT_EXPORT_TYPE,
    listenerPrependedArgs: [],
    preferredExportName: DEFAULT_NAMED_EXPORT,
    preferredEventHandlerKeys: {},
    isRecursive: false,
};

async function isValidDirectory(dirPath: PathLike) {
    try {
        const dirStats = await nodeFsPromises.lstat(dirPath);
        return dirStats.isDirectory();
    } catch {
        return false;
    }
}

function hasAddListenerMethods(object: EventEmitter): boolean {
    function hasMethod(methodName: string) {
        const method = (object as unknown as Record<string, unknown>)[methodName];
        if (typeof method !== "function") {
            return false;
        }
        return true;
    }
    /** Need a better way instead of duck typing. -xaya */
    return EVENT_EMITTER_ADD_LISTENER_METHOD_NAMES.every(hasMethod);
}

function getMergedOptions<T>(userOptions: Partial<T> | undefined, defaultOptions: T): T {
    if (userOptions !== undefined && (userOptions === null || typeof userOptions !== "object" || Array.isArray(userOptions))) {
        throw new Error(`Invalid options: '${String(userOptions)}'. Must be an object.`);
    }
    return { ...defaultOptions, ...(userOptions || {}) };
}

function getMergedListenerArgs(prependedArgs: unknown[], emittedArgs: unknown[]) {
    /**
     * I made sure it returns a new array instead of the mutable approach which is
     * directly modifying prependedArgs by Array.prototype.push(...emittedArgs),
     * while that may improve performance but it introduces potential side effects, so I didn't go with that.
     * - xaya
     */
    if (prependedArgs.length > 0) {
        return [...prependedArgs, ...emittedArgs];
    }
    return emittedArgs;
}

/**
 * The listenerPrependedArgs option serves as a way to prepend custom values to the arguments
 * passed to the event handlers' execute() method (listener callback) when an event is emitted.
 * isAsyncFunction() is used as a check so that 'await' will not promisify normal functions.
 * I will not use arrow functions or anonymous functions for the listener's callbacks,
 * they will instead remain named for verbosity and verbose error stack traces.
 *
 * Note: isAsyncFunction cannot detect if a regular non-async function is async if the regular non-async function returns a Promise.
 * From what I've read, the only way to detect if a regular function returns a promise is to call it, which is not preferred in this case.
 */
function getAsyncAwareListener(executeMethod: EventExecute, listenerPrependedArgs: unknown[]) {
    if (nodeUtilTypes.isAsyncFunction(executeMethod)) {
        async function asyncListener(...listenerEmittedArgs: unknown[]) {
            const listenerArgs = getMergedListenerArgs(listenerPrependedArgs, listenerEmittedArgs);
            return await executeMethod(...listenerArgs);
        }
        return asyncListener;
    }
    function syncListener(...listenerEmittedArgs: unknown[]) {
        const listenerArgs = getMergedListenerArgs(listenerPrependedArgs, listenerEmittedArgs);
        return executeMethod(...listenerArgs);
    }
    return syncListener;
}

function bindEventListener(
    eventEmitterLike: EventEmitter,
    moduleExport: EventHandlerModuleExport,
    preferredEventHandlerKeys: EventHandlerKeys,
    listenerPrependedArgs: unknown[],
    fileUrlHref: string,
) {
    const { name: nameKeyName, isOnce: isOnceKeyName, isPrepend: isPrependKeyName, execute: executeKeyName } = preferredEventHandlerKeys;
    if ((nameKeyName as "name") in moduleExport === false) {
        throw new Error(`Unable to find an exported property '${nameKeyName}'. Module: ${fileUrlHref}`);
    }
    if ((executeKeyName as "execute") in moduleExport === false) {
        throw new Error(`Unable to find an exported property '${executeKeyName}'. Module: ${fileUrlHref}`);
    }
    const nameValue = moduleExport[nameKeyName as "name"];
    const isOnceValue = moduleExport[isOnceKeyName as "isOnce"];
    const isPrependValue = moduleExport[isPrependKeyName as "isPrepend"];
    const executeMethod = moduleExport[executeKeyName as "execute"];
    if ((typeof nameValue !== "string" && typeof nameValue !== "symbol") || (nameValue as string).trim() === "") {
        throw new Error(`Invalid value for key ${nameKeyName}: '${String(nameValue)}'. Must be a non-empty string or symbol. Module: ${fileUrlHref}`);
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
    if (isOnceValue && isPrependValue) {
        eventEmitterLike.prependOnceListener(nameValue, listener);
        return;
    }
    if (isOnceValue) {
        eventEmitterLike.once(nameValue, listener);
        return;
    }
    if (isPrependValue) {
        eventEmitterLike.prependListener(nameValue, listener);
        return;
    }
    eventEmitterLike.on(nameValue, listener);
}

async function loadEventHandlers(
    dirPath: string,
    eventEmitterLike: EventEmitter,
    options?: LoadEventHandlersOptions,
    bindEventListenerOverride?: BindEventListenerOverride,
) {
    const absolutePath = nodePath.resolve(dirPath);
    const isValidDir = await isValidDirectory(absolutePath);
    if (!isValidDir) {
        throw new Error(`Invalid event handler directory path: '${absolutePath}'. Must be an existent accessible directory.`);
    }
    if (!hasAddListenerMethods(eventEmitterLike)) {
        throw new Error("Invalid eventEmitterLike instance. Must have EventEmitter methods.");
    }
    if (options !== undefined && (options === null || typeof options !== "object" || Array.isArray(options))) {
        throw new Error(`Invalid options: '${options}'. Must be a an object.`);
    }
    const userOptions = getMergedOptions(options as object, DEFAULT_LOAD_EVENT_HANDLERS_OPTIONS);
    const isConcurrent = userOptions.concurrent;
    const exportType = userOptions.exportType;
    const listenerPrependedArgs = userOptions.listenerPrependedArgs;
    const preferredExportName = userOptions.preferredExportName;
    const isRecursive = userOptions.isRecursive;
    const preferredEventHandlerKeys = getMergedOptions(userOptions.preferredEventHandlerKeys, DEFAULT_EVENT_HANDLER_KEY_NAMES);
    const { name: nameKeyName, isOnce: isOnceKeyName, isPrepend: isPrependKeyName, execute: executeKeyName } = preferredEventHandlerKeys;
    /** Use 'not' operator to not omit undefined and empty strings passed in options */
    if (typeof nameKeyName !== "string" || nameKeyName.trim() === "") {
        throw new Error(`Invalid preferredEventHandlerKeys name: '${nameKeyName}'. Must be a non-empty string.`);
    }
    if (typeof isOnceKeyName !== "string" || isOnceKeyName.trim() === "") {
        throw new Error(`Invalid preferredEventHandlerKeys isOnce: '${isOnceKeyName}'. Must be a non-empty string.`);
    }
    if (typeof isPrependKeyName !== "string" || isPrependKeyName.trim() === "") {
        throw new Error(`Invalid preferredEventHandlerKeys isPrepend: '${isPrependKeyName}'. Must be a non-empty string.`);
    }
    if (typeof executeKeyName !== "string" || executeKeyName.trim() === "") {
        throw new Error(`Invalid preferredEventHandlerKeys execute: '${executeKeyName}'. Must be a non-empty string.`);
    }
    if (typeof isConcurrent !== "boolean") {
        throw new Error(`Invalid isConcurrent: '${isConcurrent}'. Must be a boolean.`);
    }
    if (!DEFAULT_EXPORT_TYPES.includes(exportType)) {
        throw new Error(`Invalid export type: '${exportType}'. Must be one of string: ${DEFAULT_EXPORT_TYPES.join(", ")}`);
    }
    if (typeof preferredExportName !== "string" || preferredExportName.trim() === "") {
        throw new Error(`Invalid preferred export name: '${preferredExportName}'. Must be a non-empty string.`);
    }
    if (typeof isRecursive !== "boolean") {
        throw new Error(`Invalid isRecursive: '${isRecursive}'. Must be a boolean.`);
    }
    const filePaths = await getModulePaths(absolutePath, { recursive: isRecursive, concurrent: isConcurrent });
    await loadModulePaths(
        filePaths,
        async function (moduleExport, fileUrlHref) {
            if (typeof bindEventListenerOverride !== "function") {
                bindEventListener(eventEmitterLike, moduleExport as EventHandlerModuleExport, preferredEventHandlerKeys, listenerPrependedArgs, fileUrlHref);
                return;
            }
            if (nodeUtilTypes.isAsyncFunction(bindEventListenerOverride)) {
                await bindEventListenerOverride(eventEmitterLike, moduleExport as EventHandlerModuleExport, fileUrlHref, listenerPrependedArgs);
                return;
            }
            bindEventListenerOverride(eventEmitterLike, moduleExport as EventHandlerModuleExport, fileUrlHref, listenerPrependedArgs);
        },
        { exportType: exportType as ExportType, preferredExportName: preferredExportName, concurrent: isConcurrent },
    );
}

export { loadEventHandlers };
export default loadEventHandlers;
//
