import { describe, expect, test } from 'vitest';
import { ConnArgs, parseConnStr } from '../../src/cli/parse-conn-str';

// Valid connection strings
describe('parseConnStr - valid cases', () => {
  test('parses host only', () => {
    expect(parseConnStr('localhost')).toEqual<ConnArgs>({
      host: 'localhost',
      port: undefined,
      user: undefined,
      pass: undefined,
    });
  });

  test('parses host and port', () => {
    expect(parseConnStr('localhost:1234')).toEqual<ConnArgs>({
      host: 'localhost',
      port: 1234,
      user: undefined,
      pass: undefined,
    });
  });

  test('parses user, host, and port', () => {
    expect(parseConnStr('user@localhost:1234')).toEqual<ConnArgs>({
      host: 'localhost',
      port: 1234,
      user: 'user',
      pass: undefined,
    });
  });

  test('parses user, pass, host, and port', () => {
    expect(parseConnStr('user:pass@localhost:1234')).toEqual<ConnArgs>({
      host: 'localhost',
      port: 1234,
      user: 'user',
      pass: 'pass',
    });
  });

  test('parses user and host', () => {
    expect(parseConnStr('user@localhost')).toEqual<ConnArgs>({
      host: 'localhost',
      port: undefined,
      user: 'user',
      pass: undefined,
    });
  });

  test('parses user and pass with host', () => {
    expect(parseConnStr('user:pass@localhost')).toEqual<ConnArgs>({
      host: 'localhost',
      port: undefined,
      user: 'user',
      pass: 'pass',
    });
  });
});

// Invalid connection strings
describe('parseConnStr - invalid cases', () => {
  test('throws on empty string', () => {
    expect(() => parseConnStr('')).toThrow();
  });

  test('throws on missing host', () => {
    expect(() => parseConnStr('user:pass@:1234')).toThrow();
  });

  test('throws on too long host', () => {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const longHost = 'a'.repeat(256);
    expect(() => parseConnStr(longHost)).toThrow(/Host name too long/);
  });

  test('throws on invalid port', () => {
    expect(() => parseConnStr('localhost:70000')).toThrow(/Invalid port number/);
  });
});
