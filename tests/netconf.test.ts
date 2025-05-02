import { firstValueFrom, Observable, of, Subject, tap } from 'rxjs';
import { describe, expect, test, vi } from 'vitest';
import { Netconf } from '../src/netconf';
import { CreateSubscriptionRequest, GetDataResultType, NetconfParams, NetconfType, NotificationResult, RpcReply, RpcReplyType, SubscriptionOption } from '../src/netconf-types';

class NetconfTest extends Netconf {
  public fetchSchema(xpath: string): Observable<RpcReplyType> {
    return super.fetchSchema(xpath);
  }

  public rpcExec(request: NetconfType): Observable<RpcReply> {
    return super.rpcExec(request);
  }

  public rpcStream(
    request: CreateSubscriptionRequest, stop$?: Subject<void>
  ): Observable<NotificationResult | RpcReply> {
    return super.rpcStream(request, stop$);
  }
}

describe('constructor', () => {
  test('can be instantiated', () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new Netconf(options);
    expect(instance).toBeInstanceOf(Netconf);
  });
});

describe('getData', () => {
  test('call rpc with correct request by default (config+state)', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    // Mock the rpc method
    const mockData = { result: { 'rpc-reply': { data: { foo: 'bar' } } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    const data = await firstValueFrom(instance.getData('/foo/bar'));
    expect(instance.rpcExec).toHaveBeenCalled();
    expect(data.result).toEqual({ foo: 'bar' });
  });

  test('return undefined if empty data', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    const mockData = { result: { 'rpc-reply': { data: undefined } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    const data = await firstValueFrom(instance.getData('/foo/bar'));
    expect(data.result).toEqual(undefined);
  });

  test('return undefined if data is missing', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    instance.rpcExec = vi.fn().mockReturnValue(of({ obj: { 'rpc-reply': {} }, xml: '<rpc-reply/>' }));

    const data = await firstValueFrom(instance.getData('/foo/bar'));
    expect(data.result).toBeUndefined();
  });

  test('return undefined if rpc-reply is missing', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    instance.rpcExec = vi.fn().mockReturnValue(of({ obj: {}, xml: '' }));

    const data = await firstValueFrom(instance.getData('/foo/bar'));
    expect(data.result).toBeUndefined();
  });

  test('call rpc with configFilter "schema"', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    const mockData = { result: { 'rpc-reply': { data: { schema: true } } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    const data = await firstValueFrom(instance.getData('/foo/bar', GetDataResultType.SCHEMA));
    expect(instance.rpcExec).toHaveBeenCalledWith({
      'get-data': expect.objectContaining({
        'max-depth': 1,
      }),
    });
    expect(data.result).toEqual({ schema: true });
  });

  test('call rpc with configFilter "config"', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    const mockData = { result: { 'rpc-reply': { data: { config: true } } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    const data = await firstValueFrom(instance.getData('/foo/bar', GetDataResultType.CONFIG));
    expect(instance.rpcExec).toHaveBeenCalledWith({
      'get-data': expect.objectContaining({
        'config-filter': true,
      }),
    });
    expect(data.result).toEqual({ config: true });
  });

  test('propagate errors from rpc', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    const error = new Error('RPC failed');
    instance.rpcExec = vi.fn().mockReturnValue(of(null).pipe(tap(() => { throw error; })));

    await expect(firstValueFrom(instance.getData('/foo/bar'))).rejects.toThrow('RPC failed');
  });
});

describe('editConfigMerge', () => {
  test('merge itemConfig into each configObj', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    instance.fetchSchema = vi.fn().mockReturnValue(of({}));
    const mockData = { result: { 'rpc-reply': { ok: null } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    const itemConfig = { merged: true };

    await firstValueFrom(instance.editConfigMerge('/simple/xpath', itemConfig));

    expect(instance.rpcExec).toHaveBeenCalledWith(expect.objectContaining({
      'edit-config': expect.objectContaining({
        config: expect.objectContaining({
          simple: {
            xpath: {
              merged: true,
            },
          },
        }),
      }),
    }));
  });

  test('call fetchSchema with the correct xpath', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    const fetchSchemaMock = vi.fn().mockReturnValue(of({wildcard: {xpath: {}}}));
    instance.fetchSchema = fetchSchemaMock;
    const mockData = { result: { 'rpc-reply': { ok: null } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    const itemConfig = { merged: true };

    await firstValueFrom(instance.editConfigMerge('//wildcard/xpath', itemConfig));
    expect(fetchSchemaMock).toHaveBeenCalledWith('//wildcard/xpath');
  });

  test('not write if readOnly is true', async () => {
    const options: NetconfParams = {
      host: 'localhost',
      port: 830,
      user: 'admin',
      pass: 'admin',
      readOnly: true,
    };
    const instance = new NetconfTest(options);
    const mockData = { result: { 'rpc-reply': { ok: null } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));
    instance.fetchSchema = vi.fn().mockReturnValue(of({}));

    await firstValueFrom(instance.editConfigMerge('/simple/xpath', { merged: true }));
    expect(instance.rpcExec).not.toHaveBeenCalled();
  });

  test('throw if configObj is empty', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    instance.fetchSchema = vi.fn().mockReturnValue(of({}));
    const mockData = { result: { 'rpc-reply': { ok: null } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    const itemConfig = { merged: true };

    await expect(
      firstValueFrom(instance.editConfigMerge('//wildcard/xpath', itemConfig))
    ).rejects.toThrow('Failed to build the edit config message matching the XPath/Schema');
  });

  test('throw if editing multiple schema branches', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    instance.fetchSchema = vi.fn().mockReturnValue(of({
      wildcard: [
        {
          key: 'key1',
        },
        {
          key: 'key2',
        },
      ],
    }));
    const mockData = { result: { 'rpc-reply': { ok: null } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    const itemConfig = { merged: true };

    await expect(
      firstValueFrom(instance.editConfigMerge('//wildcard/key', itemConfig))
    ).rejects.toThrow('Editing multiple schema branches not allowed');
  });

  test('return result if rpc-reply.ok is present', async () => {
    const options: NetconfParams = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    const mockData = { result: { 'rpc-reply': { ok: null } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    const result = await firstValueFrom(instance.editConfigMerge('/simple/xpath', { some: 'config' }));
    expect(result).toMatchObject(expect.objectContaining({ result: { ok: null } }));
  });

  test('throw error if rpc-reply.ok is missing', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    const mockData = { result: { 'rpc-reply': null }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    await expect(
      firstValueFrom(instance.editConfigMerge('/simple/xpath', { some: 'config' }))
    ).rejects.toThrow('server response did not include OK');
  });

  test('throw error if rpc-reply is missing', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    const mockData = { result: { 'rpc-reply': null }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    await expect(
      firstValueFrom(instance.editConfigMerge('/simple/xpath', { some: 'config' }))
    ).rejects.toThrow('server response did not include OK');
  });
});

describe('editConfigCreate', () => {
  test('correctly set the $ attributes for create', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    instance.fetchSchema = vi.fn().mockReturnValue(of({}));
    const mockData = { result: { 'rpc-reply': { ok: null } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    const itemConfig = { merged: true };

    await firstValueFrom(instance.editConfigCreate('/simple/xpath', itemConfig));
    expect(instance.rpcExec).toHaveBeenCalledWith(expect.objectContaining({
      'edit-config': expect.objectContaining({
        config: expect.objectContaining({
          simple: {
            xpath: expect.objectContaining({
              $: {
                'nc:operation': 'create',
                'xmlns:nc': 'urn:ietf:params:xml:ns:netconf:base:1.0',
              },
            }),
          },
        }),
      }),
    }));
  });

  test('set beforeKey attributes if beforeKey is provided', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    instance.fetchSchema = vi.fn().mockReturnValue(of({}));
    const mockData = { result: { 'rpc-reply': { ok: null } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    const itemConfig = { merged: true };
    const beforeKey = '[uuid="abc"]';

    await firstValueFrom(instance.editConfigCreate('/simple/xpath', itemConfig, beforeKey));
    expect(instance.rpcExec).toHaveBeenCalledWith(expect.objectContaining({
      'edit-config': expect.objectContaining({
        config: expect.objectContaining({
          simple: {
            xpath: expect.objectContaining({
              $: {
                'xmlns:nc': 'urn:ietf:params:xml:ns:netconf:base:1.0',
                'nc:operation': 'create',
                'xmlns:yang': 'urn:ietf:params:xml:ns:yang:1',
                'yang:insert': 'before',
                'yang:key': beforeKey,
              },
            }),
          },
        }),
      }),
    }));
  });

  test('throw if configObj is empty', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    instance.fetchSchema = vi.fn().mockReturnValue(of({}));
    const mockData = { result: { 'rpc-reply': { ok: null } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    const itemConfig = { merged: true };

    await expect(
      firstValueFrom(instance.editConfigCreate('//wildcard/xpath', itemConfig))
    ).rejects.toThrow('Failed to build the edit config message matching the XPath/Schema');
  });
});

describe('editConfigDelete', () => {
  test('throw if configObj is empty', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    instance.fetchSchema = vi.fn().mockReturnValue(of({}));
    const mockData = { result: { 'rpc-reply': { ok: null } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));
    const itemConfig = { merged: true };

    await expect(
      firstValueFrom(instance.editConfigDelete('//wildcard/xpath', itemConfig))
    ).rejects.toThrow('Failed to build the edit config message matching the XPath/Schema');
  });

  test('correctly set the $ attributes', async () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    instance.fetchSchema = vi.fn().mockReturnValue(of({}));
    const mockData = { result: { 'rpc-reply': { ok: null } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));
    const itemConfig = { merged: true };

    await firstValueFrom(instance.editConfigDelete('/simple/xpath', itemConfig));
    expect(instance.rpcExec).toHaveBeenCalledWith(expect.objectContaining({
      'edit-config': expect.objectContaining({
        config: expect.objectContaining({
          simple: {
            xpath: expect.objectContaining({
              $: {
                'xmlns:nc': 'urn:ietf:params:xml:ns:netconf:base:1.0',
                'nc:operation': 'delete',
              },
            }),
          },
        }),
      }),
    }));
  });
});

describe('subscription', () => {
  test('call rpcStream with xpath filter', () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    instance.rpcStream = vi.fn().mockReturnValue(of({}));

    instance.subscription({ xpath: '/foo/bar' });
    expect(instance.rpcStream).toHaveBeenCalledWith(
      expect.objectContaining({
        'create-subscription': expect.objectContaining({
          filter: expect.objectContaining({
            $: expect.objectContaining({
              type: 'xpath',
              select: '/foo/bar',
            }),
          }),
        }),
      }),
      undefined
    );
  });

  test('call rpcStream with stream', () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    instance.rpcStream = vi.fn().mockReturnValue(of({}));

    instance.subscription({ stream: 'mystream' });
    expect(instance.rpcStream).toHaveBeenCalledWith(
      expect.objectContaining({
        'create-subscription': expect.objectContaining({
          stream: 'mystream',
        }),
      }),
      undefined
    );
  });

  test('throw if option is invalid', () => {
    const options = { host: 'localhost', port: 830, user: 'admin', pass: 'admin' };
    const instance = new NetconfTest(options);

    expect(() => instance.subscription({} as SubscriptionOption)).toThrow('Invalid option in subscription');
  });
});

describe('rpc', () => {
  test('send rpc request', async () => {
    const options: NetconfParams = { host: 'localhost', port: 830, user: 'admin', pass: 'admin', readOnly: false };
    const instance = new NetconfTest(options);
    const mockData = { result: { 'rpc-reply': {} }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    const result = await firstValueFrom(instance.rpc('/rpc', { merged: true }));
    expect(result).toMatchObject(expect.objectContaining({
      result: mockData.result['rpc-reply'],
    }));
    expect(instance.rpcExec).toHaveBeenCalledWith(expect.objectContaining({
      rpc: expect.objectContaining({
        merged: true,
      }),
    }));
  });

  test('fail in read-only mode', async () => {
    const options: NetconfParams = { host: 'localhost', port: 830, user: 'admin', pass: 'admin', readOnly: true };
    const instance = new NetconfTest(options);

    const mockData = { result: { 'rpc-reply': {} }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    const result = await firstValueFrom(instance.rpc('/rpc', { merged: true }));
    expect(result).toMatchObject(expect.objectContaining({
      result: undefined,
    }));
  });

  test('throw if rpc request is empty', async () => {
    const options: NetconfParams = { host: 'localhost', port: 830, user: 'admin', pass: 'admin'};
    const instance = new NetconfTest(options);

    await expect(
      firstValueFrom(instance.rpc('', { merged: true }))
    ).rejects.toThrow('XPath for rpc config must contain at least one element');
  });
});

describe('fetchSchema', () => {
  test('fetching schema correctly', async () => {
    const options: NetconfParams = { host: 'localhost', port: 830, user: 'admin', pass: 'admin'};
    const instance = new NetconfTest(options);

    const mockSchema = { result: { 'rpc-reply': { data: { foo: {bar: 'baz'} } } }, xml: '<rpc-reply/>' };
    instance.getData = vi.fn().mockReturnValue(of(mockSchema));
    const mockData = { result: { 'rpc-reply': { ok: null } }, xml: '<rpc-reply/>' };
    instance.rpcExec = vi.fn().mockReturnValue(of(mockData));

    await firstValueFrom(instance.editConfigMerge('//foo/bar', {}));
    expect(instance.getData).toHaveBeenCalledWith('//foo/bar', GetDataResultType.SCHEMA);
  });

  test('throw if schema is not found', async () => {
    const options: NetconfParams = { host: 'localhost', port: 830, user: 'admin', pass: 'admin'};
    const instance = new NetconfTest(options);

    const mockSchema = { result: undefined, xml: '<rpc-reply/>' };
    instance.getData = vi.fn().mockReturnValue(of(mockSchema));

    await expect(
      firstValueFrom(instance.editConfigMerge('//foo/bar', {}))
    ).rejects.toThrow('Failed to fetch element matching the XPath from the server. No element to update.');
  });
});
