/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { of } from 'rxjs';
import { NetconfType } from '../src/netconf-types';
import { describe, expect, test } from 'vitest';
import { NetconfBuildConfig } from '../src/netconf-build-config';

describe('constructor', () => {
  test('should create instance', () => {
    const builder = new NetconfBuildConfig('/interfaces/interface[name="eth1"]', of({}));
    expect(builder).toBeDefined();
  });
});

describe('error handling', () => {
  test.each([
    '',
    '/',
    '//',
    '//interfaces|//system',
  ])('throw error for "%s"', xpath => {
    expect(() => new NetconfBuildConfig(xpath, of({})))
      .toThrow();
  });

  test('handle invalid xpath patterns', async () => {
    const builder = new NetconfBuildConfig('/interfaces/interface[invalid@syntax]', of({}));
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    // Should fall back to schema-based parsing
    expect(result).toBeDefined();
  });

  test('handle empty schema', async () => {
    const builder = new NetconfBuildConfig('//interface', of({}));
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(0);
  });

  test('handle no schema', async () => {
    const builder = new NetconfBuildConfig('//interface');
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(0);
  });
});

describe('build from xpath', () => {
  test.each([
    {
      text:   'build config from simple xpath',
      xpath:  '/interfaces/interface[name="eth1"]',
      expectedResult: [{name: 'eth1'}],
      expectedTarget: {
        interfaces: {
          interface: {
            name: 'eth1',
          },
        },
      },
    },

    {
      text:   'build config from simple xpath with multiple predicates',
      xpath:  '/interfaces/interface[name="eth1"]/config-items/config-item[key="enabled"]',
      expectedResult: [{key: 'enabled'}],
      expectedTarget: {
        interfaces: {
          interface: {
            name: 'eth1',
            'config-items': {
              'config-item': {
                key: 'enabled',
              },
            },
          },
        },
      },
    },

    {
      text:   'handle namespace in config',
      xpath:  '/interfaces/interface[name="eth1"]',
      namespace: 'http://example.com/ns',
      expectedResult: [{name: 'eth1'}],
      expectedTarget: {
        interfaces: {
          $: {
            xmlns: 'http://example.com/ns',
          },
          interface: {
            name: 'eth1',
          },
        },
      },
    },

    {
      text:   'handle xpath with special characters in names',
      xpath:  '/interfaces/interface[name="eth1.100"]',
      expectedResult: [{ name: 'eth1.100' }],
      expectedTarget: undefined,
    },

    {
      text:   'handle xpath with single quotes',
      xpath:  '/interfaces/interface[name=\'eth1\']',
      expectedResult: [{ name: 'eth1' }],
      expectedTarget: undefined,
    },


  ])('$text', async ({ xpath, expectedResult, expectedTarget, namespace }) => {
    const builder = new NetconfBuildConfig(xpath, of({}), namespace ?? undefined);
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toEqual(expectedResult);
    if (expectedTarget) {
      expect(targetObj).toEqual(expectedTarget);
    }
  });
});

describe('build from schema', () => {
  test('build config from schema on a simple xpath', async () => {
    const sampleSchema = {
      interfaces: {
        interface: {
          name: 'eth1',
        },
      },
    };
    const builder = new NetconfBuildConfig('//interface[name="eth1"]', of(sampleSchema));
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'eth1',
    });
    expect(targetObj).toEqual(sampleSchema);
  });

  test('build config from schema on a xpath with multiple predicates', async () => {
    const sampleSchema: any = {
      test: {
        operator: {
          terminals: {
            terminal: {
              'mac-address': '00:00:00:00:00:99',
              'config-items': {
                'config-item': {
                  key: 'description',
                },
              },
            },
          },
        },
      },
    };
    const builder = new NetconfBuildConfig('//terminal[config-items/config-item[key="name"]/value="UT"]/config-items/config-item[key="description"]', of(sampleSchema));
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      key: 'description',
    });
    expect(targetObj).toEqual(sampleSchema);
  });

  test('build config from schema on a xpath with array in schema', async () => {
    const sampleSchema: any = {
      test: {
        operator: {
          terminals: {
            terminal: {
              'mac-address': '00:00:00:00:00:99',
              'config-items': {
                'config-item': [
                  {
                    key: 'coordinates',
                  },
                  {
                    key: 'description',
                  },
                ],
              },
            },
          },
        },
      },
    };
    const builder = new NetconfBuildConfig('//terminal[config-items/config-item[key="name"]/value="UT"]/config-items/config-item', of(sampleSchema));
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({});
    expect(targetObj).toEqual({
      test: {
        operator: {
          terminals: {
            terminal: {
              'mac-address': '00:00:00:00:00:99',
              'config-items': {
                'config-item': {},
              },
            },
          },
        },
      },
    });
  });

  test('build config from schema on a xpath with wildcard', async () => {
    const sampleSchema: any = {
      test: {
        operator: {
          terminals: {
            terminal: [
              {
                'mac-address': '00:09:ce:c0:06:8a',
                'config-items': {
                  'config-item': {
                    key: 'name',
                  },
                },
              },
              {
                'mac-address': '00:09:ce:c0:0b:4c',
                'config-items': {
                  'config-item': {
                    key: 'name',
                  },
                },
              },
            ],
          },
        },
      },
    };
    const builder = new NetconfBuildConfig('//terminal/*/config-item[key="name"]', of(sampleSchema));
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      {
        key: 'name',
      },
      {
        key: 'name',
      },
    ]);
    expect(targetObj).toEqual(sampleSchema);
  });

  test('build config from schema on a xpath matching a primitive', async () => {
    const sampleSchema: any = {
      test: {
        operator: {
          terminals: {
            terminal: {
              'mac-address': '00:00:00:00:00:99',
              status: 'offline',
            },
          },
        },
      },
    };
    const builder = new NetconfBuildConfig('//terminal[config-items/config-item[key="name"]/value="UT"]/status', of(sampleSchema));
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual('offline');
    expect(targetObj).toEqual(sampleSchema);
  });

  test('build config from schema on a xpath with wildcard on different branches', async () => {
    const sampleSchema: any = {
      test: {
        'hub-equipment': {
          modulators: {
            modulator: [
              {
                uuid: '034f479a-b483-4394-82ac-af02854cf99c',
                'config-items': {
                  'config-item': {
                    key: 'name',
                  },
                },
              },
            ],
          },
        },
        operator: {
          terminals: {
            terminal: [
              {
                'mac-address': '00:09:ce:c0:06:8a',
                'config-items': {
                  'config-item': {
                    key: 'name',
                  },
                },
              },
            ],
          },
        },
      },
    };
    const builder = new NetconfBuildConfig('//*/config-item[key="name"]', of(sampleSchema));
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      {
        key: 'name',
      },
      {
        key: 'name',
      },
    ]);
    expect(targetObj).toEqual(sampleSchema);
  });

  test('build config from schema on a xpath with wildcard as last element', async () => {
    const sampleSchema: any = {
      test: {
        operator: {
          terminals: {
            terminal: {
              'mac-address': '00:09:ce:c0:1d:d6',
              'config-items': {
                'config-item': [
                  {
                    key: 'description',
                    value: 'new desc',
                  },
                  {
                    key: 'name',
                    value: 'New User Terminal in First Group',
                  },
                ],
              },
            },
          },
        },
      },
    };
    const builder = new NetconfBuildConfig('//terminal[mac-address="00:09:ce:c0:1d:d6"]/*/config-item/*', of(sampleSchema));
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      {
        key: 'description',
        value: 'new desc',
      },
      {
        key: 'name',
        value: 'New User Terminal in First Group',
      },
    ]);
    expect(targetObj).toEqual(sampleSchema);
  });

  test('build config from schema on a xpath with wildcard as last element for non-arrays', async () => {
    const sampleSchema: any = {
      test: {
        operator: {
          terminals: {
            terminal: {
              'mac-address': '00:09:ce:c0:1d:d6',
              'config-items': '',
              status: 'offline',
              'sw-version': '',
            },
          },
        },
      },
    };
    const builder = new NetconfBuildConfig('//terminal[mac-address="00:09:ce:c0:1d:d6"]/*', of(sampleSchema));
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(1);
    expect(result).toEqual([
      {
        'mac-address': '00:09:ce:c0:1d:d6',
        'config-items': '',
        status: 'offline',
        'sw-version': '',
      },
    ]);
    expect(targetObj).toEqual(sampleSchema);
  });

  test('handle deeply nested objects with multiple wildcards', async () => {
    const sampleSchema = {
      root: {
        branch1: {
          leaf: { id: '1', value: 'test1' },
        },
        branch2: {
          leaf: { id: '2', value: 'test2' },
        },
      },
    };
    const builder = new NetconfBuildConfig('//*//leaf', of(sampleSchema));
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ id: '1', value: 'test1' });
    expect(result).toContainEqual({ id: '2', value: 'test2' });
  });

  test('handle namespace in config', async () => {
    const sampleSchema = {
      interfaces: {
        interface: {
          name: 'eth1',
        },
      },
    };
    const builder = new NetconfBuildConfig('//interface[name="eth1"]', of(sampleSchema), 'http://example.com/ns');
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'eth1',
    });
    expect(targetObj).toEqual({
      interfaces: {
        $: {
          xmlns: 'http://example.com/ns',
        },
        interface: {
          name: 'eth1',
        },
      },
    });
  });

  test('handle schema with null values', async () => {
    const sampleSchema = {
      interfaces: {
        interface: {
          name: 'eth1',
          description: null,
          status: undefined,
        },
      },
    };
    const builder = new NetconfBuildConfig('//interface', of(sampleSchema));
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'eth1',
      description: null,
      status: undefined,
    });
  });

  test('handle empty arrays in schema', async () => {
    const sampleSchema = {
      interfaces: {
        interface: [],
      },
    };
    const builder = new NetconfBuildConfig('//interface', of(sampleSchema));
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({});
  });

  test('handle mixed content types in schema', async () => {
    const sampleSchema = {
      mixed: {
        str: 'value',
        num: 123,
        bool: true,
        obj: { key: 'value' },
        arr: [1, 2, 3],
      },
    };
    const builder = new NetconfBuildConfig('//mixed', of(sampleSchema));
    const targetObj: NetconfType = {};

    const result = await new Promise<NetconfType[]>(resolve => {
      builder.build(targetObj).subscribe(resolve);
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      str: 'value',
      num: 123,
      bool: true,
    });
  });
});