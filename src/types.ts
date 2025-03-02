interface EventHandlerModule {
    [key: string]: EventHandler | undefined;
    default?: EventHandler;
}

type EventName = string | symbol;

type EventExecute = (...args: unknown[]) => void | Promise<void> | unknown | Promise<unknown>;

interface EventHandler {
    [key: string]: EventName | boolean | EventExecute | undefined;
    name?: EventName;
    isOnce?: boolean;
    isPrepend?: boolean;
    execute?: EventExecute;
}

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

export type { NamedExports, EventName, EventExecute, EventHandler, EventHandlerModule, LoadEventHandlersOptions, EventHandlerKeys };
