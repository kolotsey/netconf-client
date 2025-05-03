import { endWith, map, MonoTypeOperatorFunction, Observable, of, Subject, switchMap, tap, throwError } from 'rxjs';
import { NetconfBuildConfig } from './netconf-build-config.ts';
import { NetconfClient } from './netconf-client.ts';
import { CreateSubscriptionRequest, EditConfigResult, GetDataResult, GetDataResultType, MultipleEditError, NetconfParams, NetconfType, NotificationResult, RpcReply, RpcReplyType, RpcResult, SafeAny, SubscriptionOption } from './netconf-types.ts';

const NETCONF_DEBUG_LEVEL = 1;
const NETCONF_DEBUG_TAG = 'NETCONF';

/**
 * Netconf client
 */
export class Netconf extends NetconfClient{
  /**
   * Class constructor
   *
   * @param {NetconfParams} params - Netconf client parameters
   */
  public constructor(params: NetconfParams) {
    super(params);
  }

  /**
   * Execute a custom RPC operation. Example:
   *
   * ```typescript
   * const netconf = new Netconf({
   *   host: '127.0.0.1',
   *   port: 2022,
   *   user: 'admin',
   *   pass: 'admin',
   *   namespace: 'urn:ietf:params:xml:ns:yang:ietf-netconf-monitoring',
   * });
   * netconf.rpc('/get-schema', { identifier: 'ietf-netconf' }).subscribe({
   *   next: (data) => {
   *     console.log(data);
   *   },
   *   error: (error) => {
   *     console.error(error);
   *   },
   * });
   * ```
   *
   * @param {string} xpath - RPC command formatted as XPath
   * @param {NetconfType} values - Object of key-value pairs to be sent with the RPC request. The object may have
   *   nested objects and arrays.
   * @returns {Observable<RpcResult>} Observable of the result
   */
  public rpc(xpath: string, values: NetconfType): Observable<RpcResult> {
    xpath=xpath.trim();
    if(xpath==='' || xpath === '/' || xpath === '//'){
      return throwError(() => new Error('XPath for rpc config must contain at least one element'));
    }

    const targetObj: NetconfType = {};
    return new NetconfBuildConfig(xpath, undefined, this.params.namespace).build(targetObj).pipe(
      this.checkMultipleEdit(),
      tap((configObj: NetconfType[]) => {
        configObj.forEach((o: NetconfType) => {
          Object.assign(o, values);
        });
      }),
      switchMap(() => {
        if(this.params.readOnly){
          this.debug('Read-only mode. Would send the following request to the server:', NETCONF_DEBUG_TAG, NETCONF_DEBUG_LEVEL);
          this.debug(JSON.stringify(targetObj, null, 2), NETCONF_DEBUG_TAG, NETCONF_DEBUG_LEVEL);
          return of({
            xml: '',
            result: undefined,
          });
        }else{
          return this.rpcExec(targetObj);
        }
      }),
      map((data: RpcReply) => ({
        xml: data.xml,
        result: data.result?.['rpc-reply'],
      })),
    );
  }

  /**
   * Get items from the Netconf server using `get-data` or `get` RPC
   *
   * @param {string} xpath - XPath filter of the configuration object,
   *   for example, //aaa//user[name="admin"]
   * @param {GetDataResultType} resultType Result type (config filter)
   *   - If 'config', only the configuration is returned
   *   - If 'state', only the state data is returned
   *   - If 'schema', only the schema data for the XPath is returned (object with keys only)
   *   - If undefined, both config and state data are returned
   * @returns {Observable<GetDataResult>} Observable of the result
   */
  public getData(xpath: string, resultType?: GetDataResultType): Observable<GetDataResult> {
    let request;
    switch(resultType) {
    case GetDataResultType.SCHEMA:
      request = {
        'get-data': {
          $: {
            xmlns: 'urn:ietf:params:xml:ns:yang:ietf-netconf-nmda',
            'xmlns:ds': 'urn:ietf:params:xml:ns:yang:ietf-datastores',
          },
          datastore: 'ds:operational',
          'xpath-filter': xpath,
          'max-depth': 1,
        },
      };
      break;

    case GetDataResultType.CONFIG:
    case GetDataResultType.STATE:
      // ConfD specific get-data RPC (part of ConfD's tailf namespace)
      request = {
        'get-data': {
          $: {
            xmlns: 'urn:ietf:params:xml:ns:yang:ietf-netconf-nmda',
            'xmlns:ds': 'urn:ietf:params:xml:ns:yang:ietf-datastores',
          },
          datastore: 'ds:operational',
          'xpath-filter': xpath,
          'with-defaults': 'report-all',
          'config-filter': resultType === GetDataResultType.CONFIG ? true : false,
        },
      };
      break;

    // If undefined, both config and state data are returned
    default:
      // Standard NETCONF operation, retrieves both config and state data
      request = {
        get: {
          $: {
            xmlns: 'urn:ietf:params:xml:ns:netconf:base:1.0',
          },
          'with-defaults': {
            $: {
              xmlns: 'urn:ietf:params:xml:ns:yang:ietf-netconf-with-defaults',
            },
            _: 'report-all',
          },
          filter: {
            $: {
              type: 'xpath',
              select: xpath,
            },
          },
        },
        // Also possible to use `get-data` RPC:
        // 'get-data': {
        //   $: {
        //     xmlns: 'urn:ietf:params:xml:ns:yang:ietf-netconf-nmda',
        //     'xmlns:ds': 'urn:ietf:params:xml:ns:yang:ietf-datastores',
        //   },
        //   datastore: 'ds:operational',
        //   'xpath-filter': xpath,
        //   'with-defaults': 'report-all',
        // },
      };
      break;
    }

    return this.rpcExec(request).pipe(
      map((data: RpcResult): GetDataResult => {
        const ret: GetDataResult = {
          xml: data.xml,
          result: data.result,
        };
        if (!data.result?.hasOwnProperty('rpc-reply')){
          ret.result = undefined;
          return ret;
        }
        const rpcReply = data.result?.['rpc-reply'] as RpcReplyType;
        ret.result = rpcReply.data;
        return ret;
      })
    );
  }

  /**
   * Edit the configuration using `edit-config` RPC and merge operation
   *
   * @param {string} xpath XPath filter of the configuration object,
   *   for example, `/aaa/authentication/users/user[name="admin"]`
   * @param {NetconfType} values New config object - a key-value pair object that can have
   *   nested objects, for example `{homedir: '/home/admin'}`
   * @returns {Observable<EditConfigResult>} Observable of the result
   */
  public editConfigMerge(xpath: string, values: NetconfType): Observable<EditConfigResult> {
    const schema = this.fetchSchema(xpath);
    const targetObj = {};

    return new NetconfBuildConfig(xpath, schema, this.params.namespace).build(targetObj).pipe(
      this.checkMultipleEdit(),
      tap((configObj: NetconfType[]) => {
        configObj.forEach((o: NetconfType) => {
          Object.assign(o, values);
        });
      }),
      switchMap(() => this.editConfig(targetObj)),
    );
  }

  /**
   * Creates a leaf in the configuration specified by XPath filter.
   * Default operation is 'create', so if an item exists, confd will return error.
   * If beforeKey is specified, the item will be inserted before the specified item.
   *
   * @param {string} xpath XPath filter of the leaf where the item needs to be inserted
   *     for example,  /aaa/authentication/users/user
   * @param {NetconfType} values New item config, for example {name: 'admin', homedir: '/home/admin'}
   * @param {string} beforeKey If specified, the item will be inserted before the item specified by this key
   *     for example, '[name="oper"]'
   * @returns {Observable<EditConfigResult>} Observable of the result
   */
  public editConfigCreate(
    xpath: string,
    values: NetconfType,
    beforeKey?: string
  ): Observable<EditConfigResult> {
    const targetObj = {};
    const schema = this.fetchSchema(xpath);

    return new NetconfBuildConfig(xpath, schema, this.params.namespace).build(targetObj).pipe(
      this.checkMultipleEdit(),
      tap((configObj: NetconfType[]) => {
        configObj.forEach((o: NetconfType) => {
          Object.assign(o, values);
          o.$ = {
            ...o.$ ?? {} as SafeAny,
            'xmlns:nc': 'urn:ietf:params:xml:ns:netconf:base:1.0',
            'nc:operation': 'create',
          };
          if(beforeKey !== undefined){
            o.$ = {
              ...o.$ ?? {} as SafeAny,
              'xmlns:yang': 'urn:ietf:params:xml:ns:yang:1',
              'yang:insert': 'before',
              'yang:key': beforeKey,
            };
          }
        });
      }),
      switchMap(() => this.editConfig(targetObj)),
    );
  }

  /**
   * Deletes a leaf in the configuration. Leaf is specified by XPath filter.
   *
   * @param {string} xpath XPath filter of the leaf where the item needs to be deleted
   *     for example,  `/aaa/authentication/users/user`
   * @param {NetconfType} values object containing the leaf key, for example `{name: 'admin'}`
   * @returns {Observable<EditConfigResult>} Observable of the result
   */
  public editConfigDelete(xpath: string, values: NetconfType): Observable<EditConfigResult> {
    const targetObj = {};
    const schema = this.fetchSchema(xpath);

    return new NetconfBuildConfig(xpath, schema, this.params.namespace).build(targetObj).pipe(
      this.checkMultipleEdit(),
      tap((configObj: NetconfType[]) => {
        configObj.forEach((o: NetconfType) => {
          Object.assign(o, values);
          o.$ = {
            ...o.$ ?? {} as SafeAny,
            'xmlns:nc': 'urn:ietf:params:xml:ns:netconf:base:1.0',
            'nc:operation': 'delete',
          };
        });
      }),
      switchMap(() => this.editConfig(targetObj)),
    );
  }

  /**
   * Creates a subscription to the Netconf server and returns an observable that emits notifications as they arrive.
   * See README for an example.
   *
   * @param {SubscriptionOption} option Subscription option - either xpath filter or stream name
   * @param {Subject<void>} stop$ A subject that should emit a value to stop the subscription
   * @returns {Observable<NotificationResult | RpcResult | undefined>} Observable of the result. Observable emits
   *   the following items in order:
   *   - `RpcResult` with the server's RPC response when the subscription is created
   *   - `NotificationResult` when a notification is received
   *   - `undefined` when the subscription is stopped
   */
  public subscription(
    option: SubscriptionOption, stop$?: Subject<void>
  ): Observable<NotificationResult | RpcResult | undefined> {
    let request: CreateSubscriptionRequest;
    if(typeof option === 'object' && 'xpath' in option){
      request = {
        'create-subscription': {
          $: {
            xmlns: 'urn:ietf:params:xml:ns:netconf:notification:1.0',
          },
          filter: {
            $: {
              type: 'xpath',
              select: option.xpath,
            },
          },
        },
      };
    }else if(typeof option === 'object' && 'stream' in option){
      request = {
        'create-subscription': {
          $: {
            xmlns: 'urn:ietf:params:xml:ns:netconf:notification:1.0',
          },
          stream: option.stream,
        },
      };
    }else{
      throw new Error('Invalid option in subscription');
    }
    return this.rpcStream(request, stop$).pipe(
      map((data: NotificationResult | RpcReply) => {
        if(data.result?.hasOwnProperty('rpc-reply')){
          const rpcResult: RpcResult = {
            xml: data.xml,
            result: data.result['rpc-reply'] as RpcReplyType,
          };
          return rpcResult;
        }
        return data;
      }),
      // When subscription is closed, emit undefined
      endWith(undefined),
    );
  }

  protected fetchSchema(xpath: string): Observable<RpcReplyType> {
    return this.getData(xpath, GetDataResultType.SCHEMA).pipe(
      map((data: GetDataResult) => {
        if(data.result === undefined){
          throw new Error('Failed to fetch element matching the XPath from the server. No element to update.');
        }
        return data.result;
      }),
    );
  }

  private editConfig(configObj: NetconfType): Observable<EditConfigResult>{
    const request = {
      'edit-config': {
        target: {
          running: null,
        },
        config: configObj,
      },
    };

    if(this.params.readOnly){
      this.debug('Read-only mode. Would send the following request to the server:', NETCONF_DEBUG_TAG, NETCONF_DEBUG_LEVEL);
      this.debug(JSON.stringify(request, null, 2), NETCONF_DEBUG_TAG, NETCONF_DEBUG_LEVEL);
      return of({
        success: undefined,
        xml: '',
        result: undefined,
      });
    }

    return this.rpcExec(request).pipe(
      map((data: RpcResult): EditConfigResult => {
        const ret: EditConfigResult = {
          xml: data.xml,
          result: data.result,
        };
        if (!data.result?.hasOwnProperty('rpc-reply')){
          throw new Error('Edit-config operation failed: server response did not include rpc-reply');
        }
        const result = data.result;
        if((result['rpc-reply'] as RpcReplyType)?.ok === undefined){
          throw new Error('Edit-config operation failed: server response did not include OK confirmation');
        }
        ret.result = result['rpc-reply'] as RpcReplyType;
        return ret;
      })
    );
  }

  private checkMultipleEdit(): MonoTypeOperatorFunction<NetconfType[]> {
    return tap((configObj: NetconfType[]) => {
      if(configObj.length === 0){
        // throw an error
        throw new Error('Failed to build the edit config message matching the XPath/Schema');
      }else if(configObj.length > 1 && !this.params.allowMultipleEdit){
        // throw an error
        throw new MultipleEditError();
      }
    });
  }

  // async deleteArrayItems(xpath, itemsToRemove) {
  //   return new Promise((resolve, reject) => {
  //     // Get curretn values in the array
  //     this.getItems(xpath).then((currentArrayValues) => {
  //       if (!Array.isArray(currentArrayValues)) {
  //         throw new Error('The target xpath is not an array');
  //       }
  //       const configObj = this.NetconfBuildConfig(xpath, itemsToRemove, 'delete');
  //       const request = {
  //         'edit-config': {
  //           'target': {
  //             "running": null
  //           },
  //           'config': configObj
  //         }
  //       };
  //       Repository.lastRequest = request;
  //       this.netconfClient.rpc(request).then((configResponse) => {
  //         resolve(true);
  //       }).catch((error) => {
  //         reject(error);
  //       });
  //     }, (error) => {
  //       reject(error);
  //     });
  //   });
  // }
  // async addArrayItems(xpath, arrayValues) {
  //   return new Promise((resolve, reject) => {
  //     const configObj = this.NetconfBuildConfig(xpath, arrayValues);
  //     const request = {
  //       'edit-config': {
  //         'target': {
  //           "running": null
  //         },
  //         'config': configObj
  //       }
  //     };
  //     Repository.lastRequest = request;
  //     this.netconfClient.rpc(request).then((configResponse) => {
  //       resolve(true);
  //     }).catch((error) => {
  //       reject(error);
  //     });
  //   });
  // }
}
