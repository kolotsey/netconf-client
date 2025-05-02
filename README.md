# Javascript/Typescript Client Library and CLI for Netconf/ConfD

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A pure TypeScript library for interacting with Netconf/ConfD servers. This client provides powerful and easy-to-use
features. Comes with a CLI tool for intuitive shell access and scripting.

**This README file is for the Netconf Library. For the CLI tool, see [Netconf Console App](./CLI.md).**

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage Examples](#usage-examples)
  - [Make a get-data request](#make-a-get-data-request)
  - [Make an edit-config (merge) request](#make-an-edit-config-merge-request)
  - [Custom RPC](#custom-rpc)
  - [Concurrency](#concurrency)
  - [Subscribe to events](#subscribe-to-events)
- [API](#api)
- [License](#license)


## Description

This project provides both a Netconf/ConfD client library for Javascript/Typescript and a user-friendly CLI app for
interacting with Netconf servers. It is unique among Netconf libraries in that it allows you to use XPath expressions
(including wildcards) to both read and modify values via Netconf. The aim is to simplify Netconf interactions, making
them more straightforward and user-friendly.

## Features

- Written in pure **TypeScript**
- Uses **RxJS** - easy **concurrency** and error handling
- **Read** and **modify** values using XPath expressions, including wildcards
- API for **get/get-data**, **edit-config** (merge, create, delete operations), any custom **RPC** and **subscription**
- Response is parsed into a Javascript object, original XML response is also returned
- Comes with a CLI tool for quick shell access and scripting
- (CLI) Multiple output formats: **JSON**, **XML**, **YAML**, **tree**
- (CLI) Display server response as a tree object for easier reading

## Quick Start

```bash
npm install netconf-client
```

```typescript
import { Netconf } from 'netconf-client';
import { firstValueFrom } from 'rxjs';
const netconf = new Netconf({host: 'localhost', port: 2022, user: 'admin', pass: 'admin'});
const data = await firstValueFrom(
  netconf.getData('//aaa//user[name="admin"]')
);
```

## Installation

To use this package as a library in your project, install via npm:

```bash
npm install netconf-client
```

## Usage Examples

The examples below demonstrate how to use the library with both RxJS and Promises, so you can choose the style that
best fits your needs.

### Import the library:

```typescript
import { Netconf } from 'netconf-client';
```

### Make a get-data request:

Using promises:
```typescript
// Create a new Netconf instance
const netconf = new Netconf({host: 'localhost', port: 2022, user: 'admin', pass: 'admin'});
// Get the data from the server
const data = await firstValueFrom(netconf.getData('/confd-state/version'));
console.log((data.result as any)?.['confd-state'].version);
// Close the connection
await firstValueFrom(netconf.close());
```
Or using RxJS observables:
```typescript
// Create a new Netconf instance
const netconf = new Netconf({host: 'localhost', port: 2022, user: 'admin', pass: 'admin'});
// Get the data from the server
netconf.getData('/confd-state/version').pipe(
  // Log the result
  tap(data => console.log((data.result as any)?.['confd-state'].version)),
  // Close the connection
  switchMap(() => netconf.close()),
).subscribe();
```

### Make an edit-config (merge) request:

Don't forget to provide the AAA namespace which is required for edit-config operation on AAA module

Using promises:

```typescript
const netconf = new Netconf({
  host: 'localhost',
  port: 2022,
  user: 'admin',
  pass: 'admin',
  namespace: 'http://tail-f.com/ns/aaa/1.1', // Provide the AAA namespace
});
try {
  await firstValueFrom(netconf.editConfigMerge('//aaa//user[name="admin"]', { password: 'admin' }));
  await firstValueFrom(netconf.close());
  console.log('Edit successful');
} catch (error) {
  console.error('Edit failed', error);
}
```

Or using RxJS observables:
```typescript
const netconf = new Netconf({
  host: 'localhost',
  port: 2022,
  user: 'admin',
  pass: 'admin',
  namespace: 'http://tail-f.com/ns/aaa/1.1', // Provide the AAA namespace
});
netconf.editConfigMerge('//aaa//user[name="admin"]', { password: 'admin' }).pipe(
  tap(result => console.log('Edit status:', result.result)),
  switchMap(() => netconf.close()),
  catchError(error => {
    console.error('Edit failed', error);
    return of(void 0);
  }),
).subscribe();
```

### Custom RPC

This example shows how to use a custom RPC, in this case to get YANG schema for the first registered model.

Using promises:
```typescript
// Get YANG schema for the first registered model:
const netconf = new Netconf({
  host: 'localhost',
  port: 2022,
  user: 'admin',
  pass: 'admin',
  // Provide the namespace of the netconf-monitoring module for the get-schema RPC
  namespace: 'urn:ietf:params:xml:ns:yang:ietf-netconf-monitoring',
  // Strip namespaces from the result to only have the schema text
  stripNamespaces: true,
});
try {
  const data = await firstValueFrom(netconf.getData('/netconf-state/schemas/schema[1]'));
  const identifier = (data.result as any)['netconf-state'].schemas.schema.identifier;
  const schema = await firstValueFrom(netconf.rpc('/get-schema', { identifier }));
  await firstValueFrom(netconf.close());
  console.log(schema.result?.data);
} catch (error) {
  console.error('RPC error:', error);
}
```

Or using RxJS observables:
```typescript
const netconf = new Netconf({
  host: 'localhost',
  port: 2022,
  user: 'admin',
  pass: 'admin',
  // Provide the namespace of the netconf-monitoring module for the get-schema RPC
  namespace: 'urn:ietf:params:xml:ns:yang:ietf-netconf-monitoring',
  // Strip namespaces from the result to only have the schema text
  stripNamespaces: true,
});
netconf.getData('/netconf-state/schemas/schema[1]').pipe(
  map(data => (data.result as any)['netconf-state'].schemas.schema.identifier),
  switchMap(identifier => netconf.rpc('/get-schema', { identifier })),
  map(data => data.result?.data),
  tap(data => console.log(data)),
  switchMap(() => netconf.close()),
).subscribe();
```

### Concurrency

Only in RxJS. Note that all requests are sent to the server immediately, one after another, without waiting for the previous request to complete.

```typescript
combineLatest([
  netconf.getData('/confd-state/version'),
  netconf.getData('//aaa//user[name="admin"]'),
  netconf.getData('//sessions//username'),
]).pipe(
  tap(([version, user, username]) => {
    console.log(version);
    console.log(user);
    console.log(username);
  }),
  switchMap(() => netconf.close()),
).subscribe();
```

### Subscribe to events:

Example of event subscription using RxJS.

```typescript
const stop$ = new Subject<void>();

// Subscribe to notifications
netconf.subscription({xpath: '/'}, stop$).pipe(
  switchMap(notification => {
    if(notification?.result?.hasOwnProperty('ok')) {
      // This is a RPC Reply from ConfD with OK
      console.log('Subscription started');
      return NEVER;
    } else if (notification === undefined) {
      // When undefined is received, the subscription is stopped
      console.log('Subscription stopped');
      return of(void 0);
    } else {
      console.log('Notification:', notification);
      return NEVER;
    }
  }),
  catchError(error => {
    console.error('Subscription failed:', error.message);
    return of(void 0);
  }),
  finalize(() => {
    console.log('Closing connection');
    netconf.close().subscribe();
  }),
).subscribe();

// Stop the subscription after 10 seconds
timer(10000).pipe(
  tap(() => {
    stop$.next();
    stop$.complete();
  }),
  // Wait for the subscription to stop and connection to close
  switchMap(() => timer(5)),
).subscribe();
```

See the Library and CLI tool source code for more advanced usage examples.

## API

- `Netconf(params: NetconfParams)`

    Initializes a new Netconf instance. The `params` object specifies connection parameters (host, port, username, password) and an optional namespace that is added to the request.

    Note that the connection to the server is lazy-loaded and won't be established until you invoke a method on the instance.

- `.close(): Observable<void>`

    Close the connection.

- `.hello(): Observable<HelloResult>`

    Returns the server's hello message.

- `.getData(xpath: string, configFilter?: ConfigFilterType): Observable<GetDataResult>`

    Send a get-data request to the server. The request uses the `xpath` expression provided.

    The `configFilter` parameter specifies whether to request _configuration_ or _state_ data.

- `.editConfigMerge(xpath: string, values: object): Observable<EditConfigResult>`

    Send an edit-config (merge operation) request to the server. The `values` parameter is an object containing the key-value pairs to be merged into the configuration.

    These two operations are equivalent and will produce identical request to the server:
    ```typescript
    netconf.editConfigMerge('//list[key="keyName"]', {param: 'newValue'});
    netconf.editConfigMerge('//list', {key: 'keyName', param: 'newValue'});
    ```

    The `values` object may have multiple levels of nesting.

- `.editConfigCreate(xpath: string, values: object, beforeKey?: string): Observable<EditConfigResult>`

    Send an edit-config (create operation) request to the server. The `values` parameter is an object containing the key-value pairs to be created in the configuration.

    The `beforeKey` parameter specifies where to insert the new element in the configuration (for ordered lists). Example:
    ```typescript
    netconf.editConfigCreate('//list', {name: 'newEntry'}, '[name="existingEntry"]');
    ```

- `.editConfigDelete(xpath: string, values: object): Observable<EditConfigResult>`

    Send an edit-config (delete operation) request to the server. The `xpath` parameter is the XPath expression of the element to be deleted. The `values` parameter should provide the key of the element to be deleted. Example:

    ```typescript
    const netconf = new Netconf({
      host: 'localhost',
      port: 2022,
      user: 'admin',
      pass: 'admin',
      namespace: 'http://tail-f.com/ns/aaa/1.1',
    });
    netconf.editConfigDelete('//aaa//user', {name: 'public'}); 
    ```

- `.subscription(xpathOrStream: SubscriptionOption, stop$?: Subject<void>): Observable<NotificationResult | RpcResult | undefined>`

    Send a subscription request to the server and return an observable that emits notifications as they are received.
    The `xpathOrStream` parameter can be an object containing the property `xpath` with the XPath expression to subscribe
    to, or an object containing the property `stream` with the stream name to subscribe to.

    The `stop$` observable is an optional subject that, when emitted, will stop the subscription.

    The return value is an observable that emits in order:
    - Result of the RPC subscription request;
    - Notifications as they are received;
    - `undefined` when the subscription is stopped.

- `.rpc(cmd: string, params: object): Observable<RpcResult>`

    Send a custom RPC request to the server and return the result. The `cmd` parameter is the name of the RPC provided as an XPath expression (see example).

    The `params` object is an optional parameter that contains the parameters for the RPC. This object can have multiple levels of nesting. The special key `$` is used to specify attributes of the element.

    Example for RPC command `get` with an XPath filter. This results in a similar request as `netconf.getData('/confd-state/version')`:
    ```typescript
    netconf.rpc('/get', {
      filter: {
        $: {
          type: 'xpath',
          select: '/confd-state/version',
        }
      }
    });
    ```

## Troubleshooting

### Getting "RPC Error: Unknown element" when executing one of _editConfig_ methods

This error occurs when the server cannot find one of the parts of the XPath expression. Most likely reason is
that the request misses a namespace. Provide the namespace using the `namespace` parameter in the constructor.

### Result of getData() is empty string

The requested object was not found in the configuration or state data on the server. Likely cause: the XPath expression
is incorrect.


## License

This project is licensed under the [MIT License](LICENSE).
