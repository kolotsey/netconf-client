import asTree from 'object-as-tree';
import { MonoTypeOperatorFunction, tap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { stringify as yamlStringify } from 'yaml';
import { EditConfigResult, MultipleEditError, Result, SafeAny } from '../netconf-types';
import { Output } from './output';
import { ResultFormat } from './parse-args';
import { yellow } from './output-colors';

/**
 * RxJs operator - write the result to the console in the specified format
 *
 * @param data - The result to write
 * @param format - The format to write the result in
 */
export function writeData(format: ResultFormat): MonoTypeOperatorFunction<Result> {
  return tap(data => {
    switch (format) {
    case ResultFormat.XML:
      process.stdout.write(data.xml);
      process.stdout.write('\n');
      break;

    case ResultFormat.JSON:
      if(data.result === undefined){
        process.stdout.write(JSON.stringify(null));
      }else{
        process.stdout.write(JSON.stringify(data.result, null, 2));
      }
      process.stdout.write('\n');
      break;

    case ResultFormat.YAML:
      if(data.result === undefined){
        process.stdout.write(yamlStringify(null));
      }else{
        process.stdout.write(yamlStringify(data.result));
      }
      break;

    case ResultFormat.TREE:
    default:
      process.stdout.write(data.result as SafeAny === '' ? yellow('no result') : asTree(data.result));
      process.stdout.write('\n');
      break;
    }
  });
}

/**
 * RxJs operator - throw an error if the operation is not allowed to edit multiple schema branches
 */
export function catchMultipleEditError(): MonoTypeOperatorFunction<EditConfigResult> {
  return catchError(error => {
    if(error instanceof MultipleEditError){
      Output.error('Editing multiple schema branches not allowed. Use --allow-multiple to override.');
      throw new Error('Operation not performed');
    }
    throw error;
  });
}

/**
 * RxJs operator - set the resulting status of the edit-config
 */
export function setEditConfigStatus(): MonoTypeOperatorFunction<EditConfigResult> {
  return map((data: EditConfigResult) => {
    if(data.result?.ok !== undefined){
      data.result.ok = 'operation successful';
    }
    return data;
  });
}
