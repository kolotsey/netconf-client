import { MonoTypeOperatorFunction, tap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { stringify as yamlStringify } from 'yaml';
import { EditConfigResult, MultipleEditError, Result, RpcResult, SafeAny } from '../lib/index.ts';
import { yellow } from './output-colors.ts';
import { Output } from './output.ts';
import { ResultFormat } from './parse-args.ts';
import { asTree } from 'object-as-tree';

function isPrimitive(val: SafeAny): boolean {
  return val === null || val === undefined || typeof val === 'string'
  || typeof val === 'number' || typeof val === 'boolean';
}

function formatPrimitive(val: SafeAny): string {
  if (typeof val === 'string') {
    if (val.includes('\n')) {
      return `'${val.replace(/'/g, '\\\'')}'`;
    }
    return val;
  }
  return String(val);
}

function formatArray(val: SafeAny): string {
  return val.map((item: SafeAny) =>
    typeof item === 'string'
      ? `'${item.replace(/'/g, '\\\'')}'`
      : String(item)
  ).join(',');
}

function printKeyValue(prefix: string, obj: SafeAny): void {
  if(Array.isArray(obj)){
    if(obj.every(isPrimitive)){
      // Array of primitives
      process.stdout.write(`${prefix}=${formatArray(obj)}\n`);
    }else{
      // Array of objects: recurse into each item
      obj.forEach((item, index) => {
        // In XPath index starts at 1
        const indexedPrefix = `${prefix}[${index+1}]`;
        printKeyValue(indexedPrefix, item);
      });
    }
  }else if(obj && typeof obj === 'object'){
    for(const key of Object.keys(obj).sort()){
      const keyPrefix = prefix.length > 0 ? `${prefix}/${key}` : key;
      printKeyValue(keyPrefix, obj[key]);
    }
  }else if(prefix.length > 0){
    // Primitive: print the value
    process.stdout.write(`${prefix}=${formatPrimitive(obj)}\n`);
  }
}

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

    case ResultFormat.KEYVALUE:
      printKeyValue('', data.result);
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
  return setStatus();
}

/**
 * RxJs operator - set the resulting status of the RPC
 */
export function setRpcConfigStatus(): MonoTypeOperatorFunction<RpcResult> {
  return setStatus();
}

function setStatus(): MonoTypeOperatorFunction<Result> {
  return map((data: Result) => {
    if(data.result?.ok !== undefined){
      data.result.ok = 'operation successful';
    }
    return data;
  });
}
