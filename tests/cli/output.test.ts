import { afterEach, beforeEach, describe, expect, MockInstance, test, vi } from 'vitest';
import { Output } from '../../src/cli/output';

describe('Output', () => {
  let stderrWriteSpy: MockInstance;

  beforeEach(() => {
    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    Output.verbosity = 0; // reset verbosity before each test
  });

  afterEach(() => {
    stderrWriteSpy.mockRestore();
  });

  test('write error messages', () => {
    Output.error('fail');
    expect(stderrWriteSpy).toHaveBeenCalledWith(expect.stringContaining('fail'));
  });

  test('write info messages', () => {
    Output.info('hello');
    expect(stderrWriteSpy).toHaveBeenCalledWith(expect.stringContaining('hello'));
  });

  test('write info messages with style', () => {
    Output.info('styled', 'bold');
    expect(stderrWriteSpy).toHaveBeenCalledWith(expect.stringContaining('styled'));
  });

  test('not print stack trace if verbosity is 0', () => {
    Output.printStackTrace(new Error('test'));
    expect(stderrWriteSpy).not.toHaveBeenCalled();
  });

  test('print stack trace if verbosity > 0', () => {
    Output.verbosity = 1;
    Output.printStackTrace(new Error('test'));
    expect(stderrWriteSpy).toHaveBeenCalled();
  });

  test('print stack trace even if no error is provided', () => {
    Output.verbosity = 1;
    Output.printStackTrace();
    expect(stderrWriteSpy).toHaveBeenCalled();
  });

  test('not call debug if verbosity is 0', () => {
    Output.debug('debug message');
    expect(stderrWriteSpy).not.toHaveBeenCalled();
  });

  test('call debug if verbosity > 0', () => {
    Output.verbosity = 1;
    Output.debug('debug message');
    expect(stderrWriteSpy).toHaveBeenCalledWith(expect.stringContaining('debug message'));
  });

  test('not call debug if level > verbosity', () => {
    Output.verbosity = 1;
    Output.debug('should not print', undefined, 2);
    expect(stderrWriteSpy).not.toHaveBeenCalled();
  });

  test('call debug with source', () => {
    Output.verbosity = 1;
    Output.debug('msg', 'SRC');
    expect(stderrWriteSpy).toHaveBeenCalledWith(expect.stringContaining('SRC: msg'));
  });
});
