/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import { catchError, combineLatest, firstValueFrom, map, NEVER, Observable, of, Subject, switchMap, tap, timer } from 'rxjs';
import { Netconf } from '../src/lib/netconf';

/**
 * All examples from README.md file are implemented here.
 * You can run them using `tsx tests/readme-examples.ts`.
 * (Provided you have ConfD running on localhost)
 */


const HOST = 'localhost';

/**
 * Example from Quick Start section of README.md file.
 */
async function exampleQuickStart(): Promise<void> {
  // Create a new Netconf instance
  const netconf = new Netconf({host: HOST, port: 2022, user: 'admin', pass: 'admin'});
  // Get the data from the server
  const data = await firstValueFrom(netconf.getData('//aaa//user[name="admin"]'));
  // Close the connection
  await firstValueFrom(netconf.close());
  console.log((data.result as any)?.aaa?.authentication.users.user);
}


/**
 * Make a get-data request using promises.
 */
async function exampleGetDataPromise(): Promise<void> {
  const netconf = new Netconf({
    host: HOST,
    port: 2022,
    user: 'admin',
    pass: 'admin',
  });

  const data = await firstValueFrom(netconf.getData('/confd-state/version'));
  console.log((data.result as any)?.['confd-state'].version);
  await firstValueFrom(netconf.close());
}


/**
 * Make a get-data request using RxJS.
 */
function exampleGetDataRxJS(): Observable<void> {
  const netconf = new Netconf({
    host: HOST,
    port: 2022,
    user: 'admin',
    pass: 'admin',
  });

  return netconf.getData('/confd-state/version').pipe(
    tap(data => console.log((data.result as any)?.['confd-state'].version)),
    switchMap(() => netconf.close()),
  );
}

/**
 * Make an edit-config (merge) request using promises.
 *
 * Don't forget to provide the AAA namespace which is required for edit-config operation on AAA module
 */
async function exampleEditConfigMergePromise(): Promise<void> {
  const netconf = new Netconf({
    host: HOST,
    port: 2022,
    user: 'admin',
    pass: 'admin',
    // Provide the AAA namespace. If not provided, the client will try to guess it by accessing the server and
    // requesting shallow config for the first segment of the XPath that should include a namespace.
    namespace: 'http://tail-f.com/ns/aaa/1.1',
  });

  try {
    await firstValueFrom(netconf.editConfigMerge('//aaa//user[name="admin"]', { password: 'admin' }));
    await firstValueFrom(netconf.close());
    console.log('Edit successful');
  } catch (error) {
    console.error('Edit failed', error);
  }
}

/**
 * Make an edit-config (merge) request using RxJS.
 *
 * Don't forget to provide the AAA namespace which is required for edit-config operation on AAA module
 */
function exampleEditConfigMergeRxJS(): Observable<void> {
  const netconf = new Netconf({
    host: HOST,
    port: 2022,
    user: 'admin',
    pass: 'admin',
    namespace: 'http://tail-f.com/ns/aaa/1.1', // Provide the AAA namespace
  });

  return netconf.editConfigMerge('//aaa//user[name="admin"]', { password: 'admin' }).pipe(
    tap(result => console.log('Edit status:', result.result)),
    switchMap(() => netconf.close()),
    catchError(error => {
      console.error('Edit failed', error);
      return of(void 0);
    }),
  );
}

/**
 * Custom RPC using Promises.
 *
 * This example shows how to use a custom RPC, in this case to get YANG schema for the first registered model.
 */
async function exampleCustomRpcPromise(): Promise<void> {
  // Get YANG schema for the first registered model:
  const netconf = new Netconf({
    host: HOST,
    port: 2022,
    user: 'admin',
    pass: 'admin',
    // Provide the namespace of the netconf-monitoring module for the get-schema RPC
    namespace: 'urn:ietf:params:xml:ns:yang:ietf-netconf-monitoring',
    // Strip namespaces from the result to only have the schema text
    ignoreAttrs: true,
  });

  try {
    const data = await firstValueFrom(netconf.getData('/netconf-state/schemas/schema[1]'));
    const identifier = (data.result as any)['netconf-state'].schemas.schema.identifier;
    const schema = await firstValueFrom(netconf.rpc('/get-schema', { identifier }));
    await firstValueFrom(netconf.close());
    console.log((schema.result?.data as unknown as string)?.substring(0, 1000));
  } catch (error) {
    console.error('RPC error:', error);
  }
}

/**
 * Custom RPC using RxJS.
 *
 * This example shows how to use a custom RPC, in this case to get YANG schema for the first registered model.
 */
function exampleCustomRpcRxJS(): Observable<void> {
  const netconf = new Netconf({
    host: HOST,
    port: 2022,
    user: 'admin',
    pass: 'admin',
    namespace: 'urn:ietf:params:xml:ns:yang:ietf-netconf-monitoring',
    ignoreAttrs: true,
  });

  return netconf.getData('/netconf-state/schemas/schema[1]').pipe(
    map(data => (data.result as any)['netconf-state'].schemas.schema.identifier),
    switchMap(identifier => netconf.rpc('/get-schema', { identifier })),
    map(data => (data.result?.data as unknown as string)?.substring(0, 1000)),
    tap(data => console.log(data)),
    switchMap(() => netconf.close()),
  );
}

/**
 * Concurrency.
 *
 * Only in RxJS. Note that all requests are sent to the server immediately, one after another,
 * without waiting for the previous request to complete.
 */
function exampleConcurrencyRxJS(): Observable<void> {
  const netconf = new Netconf({
    host: HOST,
    port: 2022,
    user: 'admin',
    pass: 'admin',
  });

  return combineLatest([
    netconf.getData('/confd-state/version'),
    netconf.getData('//aaa//user[name="admin"]'),
    netconf.getData('//sessions//username'),
  ]).pipe(
    tap(([version, user, sessions]) => {
      console.log((version.result as any)?.['confd-state'].version);
      console.log((user.result as any)?.aaa.authentication.users.user);
      console.log((sessions.result as any)?.['netconf-state'].sessions);
    }),
    switchMap(() => netconf.close()),
  );
}


/**
 * Subscribe to events.
 *
 * Example of event subscription using RxJS.
 */
function subscribeToEventsRxJS(): Observable<void> {
  const netconf = new Netconf({
    host: HOST,
    port: 2022,
    user: 'admin',
    pass: 'admin',
  });
  // A subject that, when emitted, will stop the subscription
  const stop$ = new Subject<void>();

  // Subscribe to notifications
  netconf.subscription({xpath: '/'}, stop$).pipe(
    switchMap(notification => {
      if(notification?.result?.hasOwnProperty('ok')) {
        // This is a RPC Reply from ConfD with OK
        console.log('Subscription started');
        // Return NEVER, to continue the subscription and wait for notifications
        return NEVER;
      } else if (notification !== undefined) {
        // This is a notification from ConfD
        console.log('Notification:', notification);
        // Return NEVER, to continue the subscription and wait for more notifications
        return NEVER;
      } else { // notification === undefined
        // When undefined is received, the subscription is stopped
        console.log('Subscription stopped');
        // Return of(void 0), to continue down the pipe and close the connection
        return of(void 0);
      }
    }),
    catchError(_error => of(void 0)),
    switchMap(() => {
      console.log('Closing connection');
      return netconf.close();
    }),
  ).subscribe({
    next: () => {},
    error: (err: Error) => console.error('Subscription failed:', err.message),
  });

  // Stop the subscription after 1 seconds
  return timer(1000).pipe(
    tap(() => {
      stop$?.next();
      stop$?.complete();
    }),
    // Wait for the subscription to stop and connection to close
    switchMap(() => timer(1000)),
    map(() => void 0),
  );
}

/**
 * Example of debugging.
 */
async function exampleDebug(): Promise<void> {
  const netconf = new Netconf({
    host: HOST,
    port: 2022,
    user: 'admin',
    pass: 'admin',
    debug: (message: string, level: number) => {
      // Set your level of verbosity here, 3 being the most verbose
      if (level <= 1) console.log(message);
    },
  });
  await firstValueFrom(netconf.hello());
  await firstValueFrom(netconf.close());
}

async function main(): Promise<void> {
  const examples: [string, () => Promise<void>][] = [
    ['Example from Quick Start',                           exampleQuickStart],
    ['Make a get-data request using promises',             exampleGetDataPromise],
    ['Make a get-data request using RxJS',                 () => firstValueFrom(exampleGetDataRxJS())],
    ['Make an edit-config (merge) request using promises', exampleEditConfigMergePromise],
    ['Make an edit-config (merge) request using RxJS',     () => firstValueFrom(exampleEditConfigMergeRxJS())],
    ['Custom RPC using Promises',                          exampleCustomRpcPromise],
    ['Custom RPC using RxJS',                              () => firstValueFrom(exampleCustomRpcRxJS())],
    ['Concurrency',                                        () => firstValueFrom(exampleConcurrencyRxJS())],
    ['Subscribe to events using RxJS',                     () => firstValueFrom(subscribeToEventsRxJS())],
    ['Debugging',                                          exampleDebug],
  ];

  for (const [label, fn] of examples) {
    console.log(label);
    await fn();
    console.log('-----');
  }
}

main().catch((error: Error) => {
  console.error(`${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
