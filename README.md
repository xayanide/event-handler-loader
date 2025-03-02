# event-handler-loader

A lightweight utility for dynamically loading event handlers from a directory and adding the event listeners to an instance that has EventEmitter methods.

## Installation

```sh
npm install event-handler-loader
```

## Usage

### 1. Creating Event Handlers

Each event handler should be a JavaScript/TypeScript module with any file name that exports an object with the required properties: `name`, `isOnce`, `execute`.

With discord.js bot events as an example use case.

```ts
// src/eventHandlers/discordClient/clientReady
import { Events } from "discord.js";
import type { Client } from "discord.js";

export default {
    name: Events.ClientReady,
    isOnce: false,
    // You can omit isPrepend property. The rest are required.
    isPrepend: false,
    execute: function (readyClient: Client<true>) {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    },
};
```

You can also use named exports:

```ts
// src/eventHandlers/discordClient/clientReady
import { Events } from "discord.js";
import type { Client } from "discord.js";

// The module will look for any export named 'eventHandler' (case-sensitive) by default. The preferred export name can be configured.
export const eventHandler = {
    name: Events.ClientReady,
    isOnce: false,
    // You can omit isPrepend property. The name, isOnce, and execute are required.
    isPrepend: false,
    execute: function (readyClient: Client<true>) {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    },
};
```

### 2. Loading Event Handlers

With discord.js bot events as an example use case.

```ts
// src/index
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
    // Setting the preferred export name to '*' with exportType set as named will make the module import all named exports within a module that follows the event handler structure regardless of how they're named.
    // Preferred export name to look for inside a module
    preferredNamedExport: "myCustomEventHandler",
    // Default value: []
    // Prepended (first) extra arguments passed to event handlers
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

You can also choose to omit the options object to stick to the default configuration

```js
await loadEventHandlers("./path/to/eventHandlers", objectWithEventEmitterMethods);
```

### 3. Handling Async Event Handlers

This is also handled internally.

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

If an event handler is missing required keys or receives invalid types and values with those keys, an error will be thrown appropriately.

For example.

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
