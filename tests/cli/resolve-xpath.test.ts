import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { resolveXPath } from '../../src/cli/resolve-xpath.ts';

// Mock process.argv and environment variables
const ORIGINAL_ARGV = process.argv;
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.argv = [...ORIGINAL_ARGV];
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
  // Suppress console output
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  process.argv = [...ORIGINAL_ARGV];
  process.env = { ...ORIGINAL_ENV };
});

test('returns the object itself if xpathItems is empty', () => {
  const obj = { foo: 1 };
  expect(resolveXPath(obj, '')).toBe(obj);
});

test('resolves a single-level path', () => {
  const obj = { a: { b: 2 } };
  expect(resolveXPath(obj, '/a')).toBe(obj);
});

test('resolves a multi-level path', () => {
  const obj = { a: { b: { c: 3 } } };
  expect(resolveXPath(obj, '/a/b/c')).toEqual({ c: 3 });
});

test('returns the object if a level does not exist', () => {
  const obj = { a: { b: { c: 2 } } };
  expect(resolveXPath(obj, '/a/b/x')).toEqual({b: { c: 2 } });
});

test('ignores square brackets in xpathItems', () => {
  const obj = { a: { b: { c: 3 } } };
  expect(resolveXPath(obj, '/a/b[1]/c')).toEqual({ c: 3 });
});

test('returns the object if the first level does not exist', () => {
  const obj = { x: 1 };
  expect(resolveXPath(obj, '/y')).toBe(obj);
});

test('correctly handles filter in xpathItems', () => {
  const obj = { a: { b: { c: 3 } } };
  expect(resolveXPath(obj, '//c')).toEqual({ c: 3 });
});

test('correctly handles filter in xpathItems 2', () => {
  const obj = { a: { b: { c: 3 } } };
  expect(resolveXPath(obj, '//b/c')).toEqual({ c: 3 });
});

test('correctly handles filter in xpathItems 3', () => {
  const obj = { a: { b: { c: 3 } } };
  expect(resolveXPath(obj, '//b')).toEqual({ b: { c: 3 } });
});

test('ignores Xpath or |', () => {
  const obj = { a: { b: { c: 3 } }, d: { e: 4 } };
  expect(resolveXPath(obj, '/b/c|/d/e')).toBe(obj);
});

test('correctly handles wildcard *', () => {
  const obj = { a: { b: { c: 3 } } };
  expect(resolveXPath(obj, '/a/*/c')).toEqual({ c: 3 });
});

test('ignores keys, if not the last object', () => {
  const obj = { a: { key: 'value', b: { c: 3 } } };
  expect(resolveXPath(obj, '//b[key="value"]/c')).toEqual({ c: 3 });
});

test('handles multiple wildcard *', () => {
  const obj = { a: { b: { c: { d: { e: 4 } } } } };
  expect(resolveXPath(obj, '//b/*/*/e')).toEqual({ e: 4 });
});

test('returns undefined if the object is undefined', () => {
  expect(resolveXPath(undefined, '/a/b/c')).toBeUndefined();
});

test('returns the most close parent for arrays', () => {
  const obj = { a: { b: { c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] } } };
  expect(resolveXPath(obj, '//b//d')).toEqual({ c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] });
});

test('returns the most close parent for arrays 2', () => {
  const obj = { a: { b: { c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] } } };
  expect(resolveXPath(obj, '/a/b/c/d/e')).toEqual({ c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] });
});

test('returns the most close parent for arrays 3', () => {
  const obj = { a: { b: { c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] } } };
  expect(resolveXPath(obj, '//c//d')).toEqual({ c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] });
});

test('returns the most close parent for arrays 4', () => {
  const obj = { a: { b: { c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] } } };
  expect(resolveXPath(obj, '/a/b/c/d')).toEqual({ c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] });
});

test('returns the most close parent for arrays 5', () => {
  const obj = { root: { a: {
    b1: { c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] },
    b2: { c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] },
  } } };
  expect(resolveXPath(obj, '//a//d')).toEqual(obj.root);
});

test('returns the most close parent for arrays 6', () => {
  const obj = { root: { a: {
    b1: { c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] },
    b2: { c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] },
  } } };
  expect(resolveXPath(obj, '//d')).toBe(obj);
});

test('returns the most close parent for arrays 7', () => {
  const obj = { root: { a: {
    b1: { c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] },
    b2: { c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] },
  } } };
  expect(resolveXPath(obj, '/a/*/d')).toBe(obj);
});

test('returns the most close parent with last wildcard', () => {
  const obj = { a: { b: { c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] } } };
  expect(resolveXPath(obj, '//c/*')).toEqual(obj.a.b.c);
});

test('returns the most close parent with last wildcard 2', () => {
  const obj = { a: { b: { c: [{d: {e: 1, f: 2}}, {d: {e: 2, f: 3}}, {d: {e: 3, f: 4}}] } } };
  expect(resolveXPath(obj, '//d/*')).toEqual(obj.a.b.c);
});

test('returns the most close parent 8', () => {
  const obj = {
    nacm: {
      groups: {
        group: [
          {
            name: 'admin',
            'user-name': [
              'admin',
              'private',
            ],
          },
          {
            name: 'oper',
            'user-name': [
              'oper',
              'public',
            ],
          },
        ],
      },
      'rule-list': [
        {
          name: 'admin',
          group: 'admin',
        },
        {
          name: 'any-group',
          group: '*',
        },
      ],
    },
  };
  expect(resolveXPath(obj, '//nacm//group')).toBe(obj);
});

test('handles wildcards through nested arrays', () => {
  const obj = { a: [{ b: [{ c: 1 }, { c: 2 }] }, { b: [{ c: 3 }] }] };
  expect(resolveXPath(obj, '/a/*/b/*/c')).toBe(obj);
});

test('returns primitive value at leaf', () => {
  const obj = { a: { b: { c: 42 } } };
  expect(resolveXPath(obj, '/a/b/c')).toEqual({ c: 42 });
});

test('handles primitive at intermediate node', () => {
  const obj = { a: { b: 5 } };
  expect(resolveXPath(obj, '/a/b/c')).toEqual({ b: 5 });
});

test('handles empty object', () => {
  const obj = {};
  expect(resolveXPath(obj, '/a/b')).toBe(obj);
});

test('handles empty array', () => {
  const obj = { a: [] };
  expect(resolveXPath(obj, '/a/b')).toBe(obj);
});

test('handles null value in path', () => {
  const obj = { a: { b: null } };
  expect(resolveXPath(obj, '/a/b/c')).toEqual({ b: null });
});

test('handles multiple wildcards in a row', () => {
  const obj = { a: { b: { c: { d: 1 } } } };
  expect(resolveXPath(obj, '/a/*/*/d')).toEqual({ d: 1 });
});

test('handles path with only wildcards', () => {
  const obj = { a: { b: { c: 1 } } };
  expect(resolveXPath(obj, '/*/*/*')).toBe(obj);
});

test('returns ambiguous result for multiple deep matches', () => {
  const obj = { a: { b: { x: 1 } }, c: { b: { x: 2 } } };
  expect(resolveXPath(obj, '//b')).toBe(obj);
});

test('handles only root slash', () => {
  const obj = { a: 1 };
  expect(resolveXPath(obj, '/')).toBe(obj);
});

test('returns closest parent for non-existent deep key', () => {
  const obj = { a: { b: { c: 1 } } };
  expect(resolveXPath(obj, '/a/b/x/y')).toEqual({ b: { c: 1 } });
});

test('returns the entire object when the last part is a wildcard', () => {
  const obj = { a: { b: { c: 3 } } };
  expect(resolveXPath(obj, '/a/b/*')).toEqual({ c: 3 });
});

test('returns the entire object when the last part is a wildcard with multiple levels', () => {
  const obj = { a: { b: { c: { d: 4 } } } };
  expect(resolveXPath(obj, '/a/*/c/*')).toEqual({ d: 4 });
});

test('returns the entire object when the last part is a wildcard and object is nested', () => {
  const obj = { a: { b: { c: { d: { e: 5 } } } } };
  expect(resolveXPath(obj, '//d/*')).toEqual({ e: 5 });
});

test('returns the entire object when the last part is a wildcard and object is an array', () => {
  const obj = { a: { b: [{ c: 1 }, { c: 2 }] } };
  expect(resolveXPath(obj, '/a/b/*')).toEqual([{ c: 1 }, { c: 2 }]);
});

test('returns the entire object when the last part is a wildcard and object is a primitive', () => {
  const obj = { a: { b: 42 } };
  expect(resolveXPath(obj, '//b/*')).toEqual(obj.a);
});

test('returns closest parent when the last part is a wildcard and xpath is wrong', () => {
  const obj = { a: { b: { c: { d: 42 } } } };
  expect(resolveXPath(obj, '//b/d/*')).toEqual(obj.a);
});
