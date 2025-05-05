import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { OperationType, parseArgs, ResultFormat } from '../../src/cli/parse-args';
import { Output } from '../../src/cli/output';
import { GetDataResultType } from '../../src/lib';

// Mock process.argv and environment variables
const ORIGINAL_ARGV = process.argv;

beforeEach(() => {
  process.argv = [...ORIGINAL_ARGV];
  vi.stubEnv('NETCONF_HOST', undefined);
  vi.stubEnv('NETCONF_PORT', undefined);
  vi.stubEnv('NETCONF_USER', undefined);
  vi.stubEnv('NETCONF_PASS', undefined);
  // Suppress console output
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  process.argv = [...ORIGINAL_ARGV];
});

describe('info output', () => {
  test('when --help is provided, print help and return undefined', () => {
    process.argv = ['node', 'netconf', '--help'];
    expect(parseArgs()).toBe(undefined);
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('Commands:'));
  });

  test('when --version is provided, print version and return undefined', () => {
    process.argv = ['node', 'netconf', '--version'];
    expect(parseArgs()).toBe(undefined);
    expect(console.info).toHaveBeenCalledWith(expect.stringMatching(/^(?:\d+\.?)+$/));
  });
});

describe('parse connection arguments', () => {
  test('parse environment variables', () => {
    vi.stubEnv('NETCONF_HOST', 'host');
    vi.stubEnv('NETCONF_PORT', '1234');
    vi.stubEnv('NETCONF_USER', 'user');
    vi.stubEnv('NETCONF_PASS', 'pass');
    process.argv = ['node', 'netconf'];
    expect(parseArgs()).toEqual(expect.objectContaining({
      host: 'host',
      port: 1234,
      user: 'user',
      pass: 'pass',
    }));
  });

  test('parse connection string', () => {
    process.argv = ['node', 'netconf', 'user:pass@host:1234'];
    expect(parseArgs()).toEqual(expect.objectContaining({
      host: 'host',
      port: 1234,
      user: 'user',
      pass: 'pass',
    }));
  });

  test('parse command line arguments', () => {
    process.argv = ['node', 'netconf', '-H', 'host', '-p', '1234', '-U', 'user', '-P', 'pass'];
    expect(parseArgs()).toEqual(expect.objectContaining({
      host: 'host',
      port: 1234,
      user: 'user',
      pass: 'pass',
    }));
  });

  test('merge from env, conn-str, and args', () => {
    vi.stubEnv('NETCONF_USER', 'user1');
    vi.stubEnv('NETCONF_PASS', 'pass1');
    process.argv = ['node', 'netconf', '-p', '5678', 'host2'];
    expect(parseArgs()).toEqual(expect.objectContaining({
      host: 'host2',
      port: 5678,
      user: 'user1',
      pass: 'pass1',
    }));
  });

  test('error on invalid connection string', () => {
    process.argv = ['node', 'netconf', 'user:pass'];
    expect(() => parseArgs()).toThrow('Invalid connection string');
  });

  test('error when host is not provided', () => {
    process.argv = ['node', 'netconf'];
    expect(() => parseArgs()).toThrow('Host is not provided. Use -H flag, NETCONF_HOST environment variable, or connection string.');
  });
});

describe('parse arguments', () => {
  test('parse default arguments', () => {
    process.argv = ['node', 'netconf', 'localhost'];
    expect(parseArgs()).toEqual(expect.objectContaining({}));
  });

  test.each([
    ['-V', 1],
    ['--verbose', 1],
    ['-VV', 2],
  ])('parse verbose', (option, expected) => {
    process.argv = ['node', 'netconf', 'localhost', option];
    parseArgs();
    expect(Output.verbosity).toBe(expected);
  });

  test.each([
    [[], OperationType.GET],
    [['var=val'], OperationType.MERGE],
    [['set', 'var=val'], OperationType.MERGE],
    [['del', 'var=val'], OperationType.DELETE],
    [['add', 'var=val'], OperationType.CREATE],
    [['get'], OperationType.GET],
    [['rpc', 'var=val'], OperationType.RPC],
    [['sub'], OperationType.SUBSCRIBE],
    [['--hello', 'set', 'var=val'], OperationType.HELLO],
  ])('parse operation type: "%s"', (option, expected) => {
    process.argv = ['node', 'netconf', 'localhost', ...option];
    expect(parseArgs()).toEqual(expect.objectContaining({
      operation: expect.objectContaining({
        type: expected,
      }),
    }));
  });

  test.each([
    ['--config-only', GetDataResultType.CONFIG],
    ['--state-only', GetDataResultType.STATE],
    ['--schema-only', GetDataResultType.SCHEMA],
  ])('parse config-only, state-only, schema-only', (option, expected) => {
    process.argv = ['node', 'netconf', 'localhost', option];
    expect(parseArgs()).toEqual(expect.objectContaining({
      operation: expect.objectContaining({
        options: expect.objectContaining({
          configFilter: expected,
        }),
      }),
    }));
  });

  test.each([
    ['netconf', 'stream'],
    ['/', 'xpath'],
  ])('parse stream and xpath', (option, expected) => {
    process.argv = ['node', 'netconf', 'localhost', 'sub', option];
    expect(parseArgs()).toEqual(expect.objectContaining({
      operation: expect.objectContaining({
        options: expect.objectContaining({
          type: expected,
        }),
      }),
    }));
    process.argv = ['node', 'netconf', 'localhost', option, 'sub'];
    expect(parseArgs()).toEqual(expect.objectContaining({
      operation: expect.objectContaining({
        options: expect.objectContaining({
          type: expected,
        }),
      }),
    }));
  });

  test.each([
    [['--json'], ResultFormat.JSON],
    [['--xml'], ResultFormat.XML],
    [['--yaml'], ResultFormat.YAML],
    [['--keyvalue'], ResultFormat.KEYVALUE],
    [[], ResultFormat.TREE],
  ])('parse result format for "%s"', (option, expected) => {
    process.argv = ['node', 'netconf', 'localhost', ...option];
    expect(parseArgs()).toEqual(expect.objectContaining({
      resultFormat: expected,
    }));
  });

  test('parse operation and xpath', () => {
    process.argv = ['node', 'netconf', 'localhost', '/foo/bar'];
    expect(parseArgs()).toEqual(expect.objectContaining({
      operation: {
        type: 'get',
        options: expect.objectContaining({
          xpath: '/foo/bar',
        }),
      },
    }));
  });

  test.each([
    ['key=value', {key: 'value'}, 'keyvalue'],
    ['[key=value]', ['key=value'], 'list'],
  ])('correctly set operation values for "add" operation', (option, expected, expectedType) => {
    process.argv = ['node', 'netconf', 'localhost', '/foo', 'add', option];
    expect(parseArgs()).toEqual(expect.objectContaining({
      operation: expect.objectContaining({
        type: 'create',
        options: expect.objectContaining({
          editConfigValues: expect.objectContaining({
            type: expectedType,
            values: expected,
          }),
        }),
      }),
    }));
  });

  test.each([
    ['key=value', {key: 'value'}, 'keyvalue'],
    ['[key=value]', ['key=value'], 'list'],
  ])('correctly set operation values for "del" operation', (option, expected, expectedType) => {
    process.argv = ['node', 'netconf', 'localhost', '/foo', 'del', option];
    expect(parseArgs()).toEqual(expect.objectContaining({
      operation: expect.objectContaining({
        type: 'delete',
        options: expect.objectContaining({
          editConfigValues: expect.objectContaining({
            type: expectedType,
            values: expected,
          }),
        }),
      }),
    }));
  });

  test('nested values', () => {
    process.argv = ['node', 'netconf', 'localhost', '/foo', 'add', 'key.subkey=value'];
    expect(parseArgs()).toEqual(expect.objectContaining({
      operation: expect.objectContaining({
        options: expect.objectContaining({
          editConfigValues: expect.objectContaining({
            values: {
              key: {
                subkey: 'value',
              },
            },
          }),
        }),
      }),
    }));
  });
});

describe('error handling', () => {
  test.each([
    '--invalid-option',
    '-z',
  ])('error on invalid options: "%s"', option => {
    process.argv = ['node', 'netconf', 'localhost', option];
    expect(() => parseArgs()).toThrow('Unknown option');
  });

  test('error on mixing array and key-value', () => {
    process.argv = ['node', 'netconf', 'localhost', '/foo', 'a=1', '[b]'];
    expect(() => parseArgs()).toThrow('Cannot mix list items and key-value pairs');
  });

  test('error on mixing config-only and state-only', () => {
    process.argv = ['node', 'netconf', 'localhost', '--config-only', '--state-only'];
    expect(() => parseArgs()).toThrow('Cannot mix --config-only, --state-only and --schema-only');
  });

  test('error on mixing result format', () => {
    process.argv = ['node', 'netconf', 'localhost', '--json', '--xml'];
    expect(() => parseArgs()).toThrow('Cannot mix --json, --xml and --yaml');
  });

  test('error when providing list items multiple times', () => {
    process.argv = ['node', 'netconf', 'localhost', '/foo', '[a]', '[b]'];
    expect(() => parseArgs()).toThrow('List items can only be provided once');
  });

  test('error when providing list items for non-list operations', () => {
    process.argv = ['node', 'netconf', 'localhost', '/foo', '[a]'];
    expect(() => parseArgs()).toThrow('List items can only be provided for create and delete operations');
  });

  test('error when list format is invalid', () => {
    process.argv = ['node', 'netconf', 'localhost', '/foo', '[a'];
    expect(() => parseArgs()).toThrow('Invalid list, List must be enclosed in square brackets');
  });
});
