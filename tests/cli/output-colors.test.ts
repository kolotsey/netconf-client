import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { SafeAny } from '../../src/netconf-types';

describe('output-colors', () => {
  describe('when colors are supported', () => {
    let colors: typeof import('../../src/cli/output-colors');
    beforeEach(async () => {
      vi.resetModules();
      vi.spyOn(process, 'stdout', 'get').mockReturnValue({
        hasColors: vi.fn(() => true),
      } as SafeAny);
      colors = await import('../../src/cli/output-colors');
    });

    afterEach(() => {
      // Restore the original process object
      vi.restoreAllMocks();
    });

    test('export all style functions', () => {
      expect(typeof colors.bold).toBe('function');
      expect(typeof colors.red).toBe('function');
      expect(typeof colors.styleFormat).toBe('function');
    });

    test('wrap string with ANSI codes', () => {
      const result = colors.red('hello');
      expect(result).toMatch(/\u001B\[31mhello\u001B\[39m/);
    });

    test('apply styles', () => {
      const result = colors.styleFormat('hello', ['green', 'bold', 'underline']);
      expect(result).toMatch(/\u001B\[32m\u001B\[1m\u001B\[4mhello\u001B\[24m\u001B\[22m\u001B\[39m/);
    });

    test('return the same string if no styles are applied', () => {
      const result = colors.styleFormat('hello', []);
      expect(result).toBe('hello');
      const result2 = colors.styleFormat('hello', '');
      expect(result2).toBe('hello');
    });

    test('not apply styles for empty string', () => {
      const result = colors.styleFormat('', []);
      expect(result).toBe('');
    });

    test('accept a string in place of array in styleFormat', () => {
      const result = colors.styleFormat('hello', 'blue');
      expect(result).toMatch(/\u001B\[34mhello\u001B\[39m/);
    });

    test('skip unknown styles', () => {
      const result = colors.styleFormat('hello', ['yellow', 'unknown']);
      expect(result).toMatch(/\u001B\[33mhello\u001B\[39m/);
    });
  });

  describe('when colors are not supported', () => {
    let nocolors: typeof import('../../src/cli/output-colors');
    beforeEach(async () => {
      vi.resetModules();
      vi.spyOn(process, 'stdout', 'get').mockReturnValue({
        hasColors: vi.fn(() => false),
      } as SafeAny);
      nocolors = await import('../../src/cli/output-colors');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('not wrap string with ANSI codes if not supported', () => {
      const result = nocolors.red('hello');
      expect(result).toBe('hello');
    });
  });

  describe('when colors are not determined due to error', () => {
    let nocolors: typeof import('../../src/cli/output-colors');
    beforeEach(async () => {
      vi.resetModules();
      vi.spyOn(process, 'stdout', 'get').mockReturnValue({
        hasColors: vi.fn(() => {
          throw new Error('test');
        }),
      } as SafeAny);
      nocolors = await import('../../src/cli/output-colors');
    });

    test('not wrap string with ANSI codes if not supported', () => {
      const result = nocolors.red('hello');
      expect(result).toBe('hello');
    });
  });
});
