import type { EventEmitter } from "node:events";

interface EventHandlerModuleNamespace {
    default?: EventHandlerModuleExport;
    [key: string]: EventHandlerModuleExport | undefined;
}

interface EventHandlerModuleExport {
    [key: string]: EventName | boolean | EventExecute | undefined;
    name?: EventName;
    isOnce?: boolean;
    isPrepend?: boolean;
    execute?: EventExecute;
}

type EventName = string | symbol;

type EventExecute = (...args: unknown[]) => unknown | Promise<unknown>;

interface EventHandlerKeys {
    name?: string | "name";
    isOnce?: string | "isOnce";
    isPrepend?: string | "isPrepend";
    execute?: string | "execute";
}

type ExportType = "default" | "named" | "all";

type PreferredExportName = string | "eventHandler" | "*";

interface LoadEventHandlersOptions {
    isConcurrent?: boolean;
    exportType?: ExportType;
    listenerPrependedArgs?: unknown[];
    preferredExportName?: PreferredExportName;
    preferredEventHandlerKeys?: EventHandlerKeys;
    isRecursive?: boolean;
}

type BindEventListenerOverride = (
    eventEmitterLike: EventEmitter,
    moduleExport: EventHandlerModuleExport,
    fileUrlHref: string,
    listenerPrependedArgs: unknown[],
) => unknown | Promise<unknown>;

export type {
    BindEventListenerOverride,
    EventExecute,
    ExportType,
    EventHandlerKeys,
    EventHandlerModuleExport,
    EventHandlerModuleNamespace,
    EventName,
    LoadEventHandlersOptions,
    PreferredExportName,
};
