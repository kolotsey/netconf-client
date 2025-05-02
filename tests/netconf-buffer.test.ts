import { describe, expect, beforeEach, test } from 'vitest';
import { NetconfBuffer, NETCONF_DELIM } from '../src/netconf-buffer';

describe('NetconfBuffer', () => {
  let buffer: NetconfBuffer;

  beforeEach(() => {
    buffer = new NetconfBuffer();
  });

  test('append data and extract a message', () => {
    const msg = 'hello world';
    buffer.append(Buffer.from(msg + NETCONF_DELIM));
    expect(buffer.extract()).toBe(msg);
  });

  test('return undefined if delimiter is not present', () => {
    buffer.append(Buffer.from('partial message'));
    expect(buffer.extract()).toBeUndefined();
  });

  test('handle multiple messages', () => {
    const msg1 = 'foo';
    const msg2 = 'bar';
    buffer.append(Buffer.from(msg1 + NETCONF_DELIM + msg2 + NETCONF_DELIM));
    expect(buffer.extract()).toBe(msg1);
    expect(buffer.extract()).toBe(msg2);
    expect(buffer.extract()).toBeUndefined();
  });

  test('not append if buffer exceeds max size', () => {
    // Fill buffer close to max
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const bigChunk = Buffer.alloc(50 * 1024 * 1024 - 1);
    expect(buffer.append(bigChunk)).toBe(true);
    // This chunk will overflow
    expect(buffer.append(Buffer.alloc(2))).toBe(false);
  });

  test('clear the buffer', () => {
    buffer.append(Buffer.from(`something${NETCONF_DELIM}`));
    buffer.clear();
    expect(buffer.extract()).toBeUndefined();
  });

  test('correct toString()', () => {
    buffer.append(Buffer.from(`something${NETCONF_DELIM}`));
    expect(buffer.toString()).toBe(`something${NETCONF_DELIM}`);
  });
});
