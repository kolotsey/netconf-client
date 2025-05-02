import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { resolveXPath } from '../../src/cli/resolve-xpath';

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
  expect(resolveXPath(obj, '/a')).toEqual({ b: 2 });
});

test('resolves a multi-level path', () => {
  const obj = { a: { b: { c: 3 } } };
  expect(resolveXPath(obj, '/a/b/c')).toEqual(3);
});

test('returns the object if a level does not exist', () => {
  const obj = { a: { b: 2 } };
  expect(resolveXPath(obj, '/a/x')).toEqual({ b: 2 });
});

test('ignores square brackets in xpathItems', () => {
  const obj = { a: { b: { c: 3 } } };
  expect(resolveXPath(obj, '/a/b[1]/c')).toEqual(3);
});

test('returns the object if the first level does not exist', () => {
  const obj = { x: 1 };
  expect(resolveXPath(obj, '/y')).toEqual(obj);
});

test('ignores filter in xpathItems', () => {
  const obj = { a: { b: { c: 3 } } };
  expect(resolveXPath(obj, '//a/b/c')).toEqual(obj);
});

test('returns undefined if the object is undefined', () => {
  expect(resolveXPath(undefined, '/a/b/c')).toBeUndefined();
});
