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

type ImportModes = "parallel" | "sequential";

type ExportTypes = "default" | "named";

type NamedExports = string | "eventHandler" | "*";

interface LoadEventHandlersOptions {
    importMode?: ImportModes;
    exportType?: ExportTypes;
    listenerPrependedArgs?: unknown[];
    preferredNamedExport?: NamedExports;
    preferredEventHandlerKeys?: EventHandlerKeys;
}

export type { EventExecute, EventHandlerKeys, EventHandlerModuleExport, EventHandlerModuleNamespace, EventName, ImportModes, LoadEventHandlersOptions, NamedExports };
