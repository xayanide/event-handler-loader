# event-handler-loader

A simple and lightweight way load event handlers from a directory and attach them to any EventEmitter-like instance. It supports two ways of importing files, flexible event handler structures, and lets you customize how listeners are added.

## Installation

```sh
npm install event-handler-loader
```

## Intro

Working with events usually means manually setting up event handlers on an EventEmitter instance. It’s okhi for small projects, but as things grow, it can quickly become messy and repetitive.

This utility simplifies things by automatically loading event handlers from a directory and attaching them to an EventEmitter-like instance—basically, any object with the same event-handling methods as Node.js’ EventEmitter. The tradeoff? It follows a somewhat fixed structure and might not mesh well with more OOP-heavy approaches.

> [!NOTE]
> An *"EventEmitter-like instance"* is any object that implements the same event-handling methods as Node.js' `EventEmitter`.
> This means it must have the following methods:
>
> - `on(event, listener)`: Registers a listener for an event.
> - `once(event, listener)`: Registers a listener that runs only once.
> - `addListener(event, listener)`: Alias for `on()`.
> - `prependListener(event, listener)`: Adds a listener before any existing ones.
> - `prependOnceListener(event, listener)`: Like `once()`, but added to the front of the listener queue.

## Usage

#### Creating Event Handlers

Each event handler should be a JavaScript/TypeScript module with *any file name* that exports an object with the required properties: `name`, `isOnce`, `execute`.

### Simplest Example with Node.js' `process` Events

With Node.js' `process` as the simplest example to demonstrate how it can be used.

#### Loading Event Handlers

```ts
// src/index.ts
import * as nodePath from "node:path";
import * as nodeUrl from "node:url";
import { loadEventHandlers } from "event-handler-loader";

const eventHandlersFolder = nodePath.join(nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url)), "eventHandlers");
const processEventsFolder = nodePath.join(eventHandlersFolder, "process");

// This is with all configuration options exposed and changed from defaults to demonstrate what can be configured.
await loadEventHandlers(processEventsFolder, process, {
    // Default value: default
    exportType: "named",
    // Default value: parallel
    importMode: "sequential",
    // Default value: "eventHandler"
    preferredNamedExport: "handler",
    // Default value: { name: "name", isOnce: "isOnce", isPrepend: "isPrepend", execute: "execute" }
    preferredEventHandlerKeys: { name: "eventName", isOnce: "once", isPrepend: "prepend", execute: "run" },
    // Default value: []
    listenerPrependedArgs: ["myString", { number: 1 }],
});

// Simulate an uncaughtException event.
process.emit("uncaughtException", new Error("MyDeadlyError"));

// Other way of simulating an uncaughtException in this case
// throw new Error("MyDeadlyError")
```

#### Creating Event Handlers

With `exportType: named`, it'll look for exports with a specific configured `preferredNamedExport: handler` in this example. It's `eventHandler` by default.

```ts
// src/eventHandlers/process/named.ts

// exportType: named
// preferredNamedExport: handler
export const handler = {
    // Keys follow as configured preferredEventHandlerKeys: { name: "eventName", isOnce: "once", isPrepend: "prepend", execute: "run" }
    eventName: "uncaughtException",
    // isOnce and isPrepend keys can be omitted. Only name, and execute keys are required.
    prepend: false,
    once: false,
    run: function (_myString: string, _object: unknown, error: Error) {
        // "myString"
        console.log("1st custom prepended parameter", _myString);
        // { number: 1 }
        console.log("2nd custom prepended parameter", _object);
        // Error: MyDeadlyError
        console.log(`3rd actual emitted parameter:\nEncountered an uncaught exception\n${error.message}\n${error.stack}`);
    },
};
```

With `exportType: default`, it'll look for default exports exclusively, like so:

```ts
// src/eventHandlers/process/default.ts

// exportType: default
// (ignored) preferredNamedExport: handler (preferredNamedExport is ignored because it's configured to find default exports only)
export default {
    // Keys follow as configured preferredEventHandlerKeys: { name: "eventName", isOnce: "once", isPrepend: "prepend", execute: "run" }
    eventName: "uncaughtException",
    once: false,
    // isOnce and isPrepend keys can be omitted. Only name, and execute keys are required.
    prepend: false,
    // Method emits the prepended values as configured: listenerPrependedArgs: ["myString", { number: 1 }],
    run: function (_myString: string, _object: unknown, error: Error) {
        // "myString"
        console.log("1st custom prepended parameter", _myString);
        // { number: 1 }
        console.log("2nd custom prepended parameter", _object);
        // Error: MyDeadlyError
        console.log(`3rd actual emitted parameter:\nEncountered an uncaught exception\n${error.message}\n${error.stack}`);
    },
};
```

### Example with Discord.js' `Client` Events

With Discord.js' `Client` as an example.

#### Loading Event Handlers

```ts
// src/index.ts
import * as nodePath from "node:path";
import * as nodeUrl from "node:url";
import * as discordJs from "discord.js";
import { loadEventHandlers } from "event-handler-loader";

const eventHandlersFolder = nodePath.join(nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url)), "eventHandlers");
const discordClientEventsFolder = nodePath.join(eventHandlersFolder, "discordClient");

const discordClient = new discordJs.Client({ intents: [discordJs.GatewayIntentBits.Guilds] });
await loadEventHandlers(discordClientEventsFolder, discordClient);

try {
    await discordClient.login("VERY_SECURE_TOKEN_INDEED");
} catch (loginErr) {
    console.error(`DiscordClient#login\n${loginErr}`);
}
```

#### Creating Event Handlers

```ts
// src/eventHandlers/discordClient/clientReady.ts
import { Events } from "discord.js";
import type { Client } from "discord.js";

export default {
    name: Events.ClientReady,
    // isOnce and isPrepend keys can be omitted. Only name, and execute keys are required.
    isOnce: false,
    isPrepend: false,
    execute: function (readyClient: Client<true>) {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    },
};
```

You can also use named exports:

```ts
// src/eventHandlers/discordClient/clientReady.ts
import { Events } from "discord.js";
import type { Client } from "discord.js";

// With exportType: named", the module will look for any export named 'eventHandler' (case-sensitive) by default. The preferred export name can be configured.
export const eventHandler = {
    name: Events.ClientReady,
    // isOnce and isPrepend keys can be omitted. Only name, and execute keys are required.
    isOnce: false,
    isPrepend: false,
    execute: function (readyClient: Client<true>) {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    },
};
```

### Optional Options

You can customize how event handlers are loaded using an options object:

```js
await loadEventHandlers("./path/to/eventHandlers", objectWithEventEmitterMethods, {
    // Default value: parallel
    // Options: "parallel" or "sequential"
    // How the module imports event handlers
    importMode: "sequential",
    // Default value: default
    // Options: "default" or "named"
    // The type of export the module should look for.
    exportType: "named",
    // Default value: eventHandler (Case-sensitive!)
    // Options: non-empty string or "*"
    // Setting preferredExportName: "*" with
    // exportType: named will make the module import all named exports from a module that
    // follows the event handler structure regardless of how they're named.
    // Preferred export name to look for inside a module.
    // Setting exportType: "default" will ignore this option as "default"
    preferredNamedExport: "myCustomEventHandler",
    // Default value: []
    // Prepended (first) extra arguments passed to event handlers' listener callbacks
    listenerPrependedArgs: ["IAmAvailableAsAParameterToAllEmittedEvents"],
    // Default value: { name: "name", isOnce: "isOnce", isPrepend: "isPrepend", execute: "execute" }
    // Preferred key names to look for within the exported object
    preferredEventHandlerKeys: {
        name: "eventName",
        isOnce: "once",
        isPrepend: "prepend",
        execute: "run",
    },
});
```

You can also choose to omit the options object entirely and stick to the default configuration

```js
await loadEventHandlers("./path/to/eventHandlers", objectWithEventEmitterMethods);
```

### Exporting Manually and Dynamically Created Event Handlers in One File

```ts
// src/index.ts
import * as nodePath from "node:path";
import * as nodeUrl from "node:url";
import { loadEventHandlers } from "event-handler-loader";

const eventHandlersFolder = nodePath.join(nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url)), "eventHandlers");
const processEvents = nodePath.join(eventHandlersFolder, "process");

await loadEventHandlers(processEvents, process, {
    exportType: "named",
    importMode: "parallel",
    // Import all named exports from all modules in a directory together with exportType: "named"
    preferredNamedExport: "*",
    listenerPrependedArgs: ["myString", { number: 1 }],
});

process.emit("uncaughtException", new Error("MyDeadlyError"));

// src/eventHandlers/process/named.ts
type EventHandler = {
    name: string;
    execute: (myString: string, object: {}, ...args: unknown[]) => void;
};

type EventHandlers = {
    [eventName: string]: EventHandler;
};

// The exit event is manually defined and exported and named separately with a unique behavior: console.log("I am built different"), console.log("Event: 'exit'")
export const exit = {
    name: "exit",
    execute: function (_myString: string, _object: {}, ...args: unknown[]) {
        console.log("I am built different");
        console.log("Event: 'exit'");
        console.log("1st custom prepended parameter:", _myString);
        console.log("2nd custom prepended parameter:", _object);
        if (args.length) {
            console.log("Emitted parameters:", ...args);
        }
    },
};

// Dynamically generating and exporting event handlers
const processEventNames = ["SIGINT", "SIGUSR1", "SIGUSR2", "SIGTERM", "uncaughtException", "unhandledRejection"];

function createProcessEventHandlers() {
    return processEventNames.reduce(function (handlers: EventHandlers, eventName) {
        handlers[eventName] = {
            name: eventName,
            // All callback listeners of "SIGINT", "SIGUSR1", "SIGUSR2", "SIGTERM", "uncaughtException", "unhandledRejection" except "exit" do the same thing:
            execute: function (_myString: string, _object: {}, ...args: unknown[]) {
                console.log("We all do the same thing")
                console.log(`Event: '${eventName}'`);
                console.log("1st custom prepended parameter:", _myString);
                console.log("2nd custom prepended parameter:", _object);
                if (args.length) {
                    console.log("Emitted parameters:", ...args);
                }
            },
        };
        return handlers;
    }, {});
}

// An object of process event handlers all with similar callback operations
// Each have their own event name as key names, and they all do the same thing
const eventHandlers = createProcessEventHandlers();
// Destructure eventHandlers and export each named event handler as a named export.
export const { SIGINT, SIGUSR1, SIGUSR2, SIGTERM, uncaughtException, unhandledRejection } = eventHandlers;
```

### Handling Async Event Handlers

These are also handled internally.

```js
export default {
    name: "fetchData",
    isOnce: true,
    async execute() {
        const response = await fetch("https://dog.ceo/api/breeds/image/random")
        const data = await response.json()
        console.log("Fetched data:", data);
    }
};
```

## Error Handling

If an event handler is missing required keys or receives invalid types and values with those keys, an error will be thrown appropriately to let you know.

For instance:

`exportType: "default"` (`default` by default) will look for event handler modules with default exports only.

```ts
await loadEventHandlers("DirectoryToModulesWithNamedExports", eventEmitter, { exportType: "default", });
```

However, when it encounters named exports when it's expecting default exports:

```sh
Error: Invalid event handler module. Must be a default export.
```

Make sure your event handlers follow the required and configured structure.

## Use Cases

- **Discord Bots**: Load event handlers dynamically for events.
- **Modular Applications**: Load user-defined events dynamically.

## The project's core tech stack
- [TypeScript](https://www.typescriptlang.org) - Programming language, a superset of JavaScript
- [JavaScript](https://en.wikipedia.org/wiki/JavaScript) - Programming language
- [Node.js](https://github.com/nodejs/node) - JavaScript runtime

## The project incorporates the following tools
- [eslint](https://github.com/eslint/eslint) - Code linting
- [prettier](https://github.com/prettier/prettier) - Code formatting
- [commitlint](https://github.com/conventional-changelog/commitlint) - Enforcing commit message conventions
- [semantic-release](https://github.com/semantic-release/semantic-release) - Automated versioning and releases
- [jest](https://jestjs.io) - JavaScript testing framework
