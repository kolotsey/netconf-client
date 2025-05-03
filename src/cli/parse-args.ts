// import * as getoptsImport from 'getopts';
import * as getoptsImport from 'getopts';
import * as packageJson from '../../package.json' with { type: 'json' };
import { GetDataResultType, NetconfType, SafeAny } from '../lib/index.ts';
import { showHelp } from './help.ts';
import { Output } from './output.ts';
import { ConnArgs, parseConnStr } from './parse-conn-str.ts';

export const DEFAULT_USER = 'admin';
export const DEFAULT_PASS = 'admin';
export const DEFAULT_PORT = 2022;
export const DEFAULT_XPATH = '/';

const OPERATION_ALIASES = {
  add: 'create',
  cre: 'create',
  rem: 'delete',
  del: 'delete',
  sub: 'subscribe',
  rpc: 'rpc',
  exec: 'rpc',
} as const;

export enum OperationType {
  /**
   * Print hello message and exit
   */
  HELLO = 'hello',
  /**
   * get-data operation
   */
  GET = 'get',
  /**
   * edit-config, nc:operation="merge"
   */
  MERGE = 'merge',
  /**
   * edit-config, nc:operation="create"
   */
  CREATE = 'create',
  /**
   * edit-config, nc:operation="delete"
   */
  DELETE = 'delete',
  /**
   * subscribe to notifications
   */
  SUBSCRIBE = 'subscribe',
  /**
   * arbitrary rpc exec
   */
  RPC = 'rpc',
}

/**
 * Options for Get operation.
 */
type GetOptions = {
  /**
   * XPath filter to use for the operation
   */
  xpath: string;
  /**
   * Request only the configuration, state or schema. If not provided, all data will be requested.
   */
  configFilter?: GetDataResultType;
  /**
   * If true, print the full tree of the result.
   * If false, strip parent nodes to simplify the output
   */
  fullTree?: boolean;
  /**
   * Print namespaces in the result. Namespaces are sent by the server and stripped by default.
   */
  showNamespaces?: boolean;
};

/**
 * Options for edit-config with operation="merge".
 */
type MergeOptions = {
  /**
   * XPath filter to use for the operation.
   * If XPath is /config/interfaces/interface[name='GigabitEthernet1/0/1']
   * then the operation will be performed on the `interface` node.
   */
  xpath: string;
  /**
   * Key-value pairs to be merged into the set
   */
  setVals?: NetconfType;
  /**
   * Allow multiple schema branches to be edited in a single operation
   */
  allowMultiple?: boolean;
};

/**
 * Options for edit-config with operation="create".
 */
type CreateOptions = {
  /**
   * XPath filter to use for the operation.
   * If XPath is /config/interfaces/interface[name='GigabitEthernet1/0/1']
   * then the `interface` node will be created with key name=GigabitEthernet1/0/1.
   */
  xpath: string;
  /**
   * Key-value pairs to be created in the set
   */
  setVals?: NetconfType;
  /**
   * Key to insert the new object before
   */
  beforeKey?: string;
  /**
   * Allow multiple schema branches to be edited in a single operation
   */
  allowMultiple?: boolean;
};

/**
 * Options for edit-config with operation="delete".
 */
type DeleteOptions = {
  /**
   * XPath filter to use for the operation.
   * If XPath is /config/interfaces/interface[name='GigabitEthernet1/0/1']
   * then the `interface` node will be deleted.
   */
  xpath: string;
  /**
   * Key-value pairs to be deleted from the set
   */
  setVals?: NetconfType;
  /**
   * Allow multiple schema branches to be edited in a single operation
   */
  allowMultiple?: boolean;
};

/**
 * Options for subscription to notifications.
 */
type SubscribeOptions = {
  type: 'xpath';
  /**
   * XPath filter to use for the operation.
   */
  xpath: string;
} | {
  type: 'stream';
  /**
   * Notification stream to use for the operation, for example "netconf".
   */
  stream: string;
};

/**
 * Options for RPC operation.
 */
type RpcOptions = {
  /**
   * Command to execute.
   */
  cmd: string;
  /**
   * Key-value pairs to be added to the RPC request
   */
  setVals?: NetconfType;
};

type Operation =
  | { type: undefined }
  | { type: OperationType.HELLO }
  | { type: OperationType.GET, options: GetOptions }
  | { type: OperationType.MERGE, options: MergeOptions }
  | { type: OperationType.CREATE, options: CreateOptions }
  | { type: OperationType.DELETE, options: DeleteOptions }
  | { type: OperationType.SUBSCRIBE, options: SubscribeOptions }
  | { type: OperationType.RPC, options: RpcOptions };

export enum ResultFormat {
  JSON = 'json',
  XML = 'xml',
  YAML = 'yaml',
  TREE = 'tree',
}

export interface CliOptions {
  /**
   * Netconf host name or IP address
   */
  host: string;

  /**
   * Netconf port number
   */
  port: number;

  /**
   * Netconf username
   */
  user: string;

  /**
   * Netconf password
   */
  pass: string;

  /**
   * Operation to be performed
   */
  operation: Operation;

  /**
   * YANG namespace to add to the request
   */
  namespace?: string;

  /**
   * Print result in the specified format
   */
  resultFormat: ResultFormat;

  /**
   * Array values to be added
   */
  setArray?: string[];

  /**
   * Only read the data from the server, no edit-config or RPC operations
   */
  readOnly?: boolean;
}

/**
 * Parse command line arguments
 *
 * @returns If parsing was successful, an object with the parsed options is returned. In case when help or version
 *   options are provided, the function will return undefined and the program must exit with 0 (success) code.
 *   If parsing fails, the function will throw an error.
 */
// eslint-disable-next-line max-lines-per-function, sonarjs/cognitive-complexity
export function parseArgs(): CliOptions | undefined {
  let args = process.argv.slice(2);
  const getopts = (getoptsImport as SafeAny).default as unknown as typeof import('getopts');
  const opt = getopts(args, {
    alias: {
      b: 'before-key',
      'config-only': 'config',
      f: 'full-tree',
      h: 'help',
      H: 'host',
      j: 'json',
      n: 'namespace',
      p: 'port',
      P: 'pass',
      'schema-only': 'schema',
      s: 'show-namespaces',
      'state-only': 'state',
      U: 'user',
      v: 'version',
      V: 'verbose',
      x: 'xml',
      y: 'yaml',
    },
    default: {
      'allow-multiple': false,
      'before-key': undefined,
      'config-only': false,
      'dry-run': false,
      'full-tree': false,
      host: undefined,
      json: false,
      namespace: undefined,
      pass: undefined,
      port: undefined,
      'read-only': false,
      'schema-only': false,
      'state-only': false,
      user: undefined,
      'show-namespaces': false,
      xml: false,
      yaml: false,
      hello: false,
    },
    // eslint-disable-next-line id-denylist
    boolean: [
      'allow-multiple', 'config-only', 'dry-run', 'full-tree', 'help', 'json', 'read-only', 'schema-only',
      'show-namespaces', 'state-only', 'version', 'verbose', 'xml', 'yaml', 'hello',
    ],
    unknown: (optionName: string): boolean => {
      throw new Error(`Unknown option: ${optionName}`);
    },
  });

  if (opt.help) {
    showHelp();
    return undefined;
  }

  if (opt.version) {
    console.info(packageJson.default.version);
    return undefined;
  }

  // Check verbose level. If it's an array, use the length, otherwise use 1 if it's true, 0 otherwise
  // Immediatly set the verbose level to the Output class.
  let verbose = 0;
  if (Array.isArray(opt.verbose)) {
    verbose = opt.verbose.length;
  } else {
    verbose = opt.verbose ? 1 : 0;
  }
  if (verbose > 0) {
    Output.verbosity = verbose;
    Output.debug(`Verbose output enabled, level ${verbose}`);
  }

  let xpath: string | undefined;
  let conn: string | undefined;
  let stream: string | undefined;
  let operationType: OperationType | undefined;
  const setVals: NetconfType = {};
  const setArray: string[] = [];

  // Parsing command line arguments and getting the requested XPath and credentials (if provided)
  args = opt._.filter(arg => arg !== '');
  while (args.length) {
    // Operation
    const op = args[0].substring(0, 3).toLowerCase();
    if (op in OPERATION_ALIASES) {
      const normalizedOp = OPERATION_ALIASES[op as keyof typeof OPERATION_ALIASES] || op;
      if(Object.values(OperationType).includes(normalizedOp as OperationType)) {
        operationType = normalizedOp as OperationType;
      }else{
        throw new Error(`Invalid operation: ${op}`);
      }
      args.shift();

    // XPath
    } else if (args[0].substring(0, 1) === '/') {
      xpath = args.shift() as string;

    // Test if the argument is a var=val
    } else if (args[0].includes('=')) {
      // var=val
      // Will be processed later as setVals
      break;

    // Connection string
    } else {
      if(!conn) {
        conn = args.shift();
      } else {
        stream = args.shift();
      }
    }
  }

  // Get connection arguments
  const connArgs = getConnectionArgs(opt, conn);

  // Parse key-value pairs and array values from the command line
  while(args.length){
    // Test if the argument is a var=val
    if(args[0].includes('=')){
      const arg = args.shift() as string;
      const idx = arg.indexOf('=');
      const key = arg.substring(0, idx);
      const val = arg.substring(idx + 1);
      setNestedValue(setVals, key, val);

    // Treat as an array of values
    }else{
      const value=args.shift();
      if(value){
        setArray.push(value);
      }
    }
  }
  if(setArray.length && Object.keys(setVals).length){
    throw new Error('Cannot mix list (array) items and key-value pairs');
  }

  // Determine the operation type to be performed
  if(opt.hello){
    operationType = OperationType.HELLO;
  }else if((setArray.length || Object.keys(setVals).length) && operationType === undefined){
    // If there are array values or key-value pairs, and the operation is not set, change the operation to MERGE
    operationType = OperationType.MERGE;
  }else if(operationType === undefined){
    // If operation is not set, assume GET
    operationType = OperationType.GET;
  }

  if(Number(opt['config-only']) + Number(opt['state-only']) + Number(opt['schema-only']) > 1){
    throw new Error('Cannot mix --config-only, --state-only and --schema-only');
  }

  const operationMap: Record<OperationType, (xpath?: string) => Operation> = {
    [OperationType.HELLO]: () => ({ type: OperationType.HELLO }),
    [OperationType.GET]: (x?: string) => ({
      type: OperationType.GET,
      options: {
        xpath: x ?? DEFAULT_XPATH,
        configFilter: opt['config-only']
          ? GetDataResultType.CONFIG
          : opt['state-only']
            ? GetDataResultType.STATE
            : opt['schema-only']
              ? GetDataResultType.SCHEMA
              : undefined,
        fullTree: opt['full-tree'],
        showNamespaces: opt['show-namespaces'],
      },
    }),
    [OperationType.MERGE]: (x?: string) => ({
      type: OperationType.MERGE,
      options: {
        xpath: x ?? DEFAULT_XPATH,
        setVals,
        allowMultiple: opt['allow-multiple'],
      },
    }),
    [OperationType.CREATE]: (x?: string) => ({
      type: OperationType.CREATE,
      options: {
        xpath: x ?? DEFAULT_XPATH,
        setVals,
        beforeKey: opt['before-key'],
        allowMultiple: opt['allow-multiple'],
      },
    }),
    [OperationType.DELETE]: (x?: string) => ({
      type: OperationType.DELETE,
      options: {
        xpath: x ?? DEFAULT_XPATH,
        setVals,
        allowMultiple: opt['allow-multiple'],
      },
    }),
    [OperationType.SUBSCRIBE]: (x?: string) => ({
      type: OperationType.SUBSCRIBE,
      options: stream ? {
        type: 'stream',
        stream,
      } : {
        type: 'xpath',
        xpath: x ?? DEFAULT_XPATH,
      },
    }),
    [OperationType.RPC]: (x?: string) => ({
      type: OperationType.RPC,
      options: {
        cmd: x ?? DEFAULT_XPATH,
        setVals,
      },
    }),
  };

  const operation = operationMap[operationType](xpath);

  if(Number(opt.json) + Number(opt.xml) + Number(opt.yaml) > 1){
    throw new Error('Cannot mix --json, --xml and --yaml');
  }

  const cliOptions: CliOptions = {
    host: connArgs.host,
    port: connArgs.port ?? DEFAULT_PORT,
    user: connArgs.user ?? DEFAULT_USER,
    pass: connArgs.pass ?? DEFAULT_PASS,
    operation,
    namespace: opt.namespace,
    readOnly: opt['read-only'],
    resultFormat:
      opt.json ? ResultFormat.JSON : opt.xml ? ResultFormat.XML : opt.yaml ? ResultFormat.YAML : ResultFormat.TREE,
  };

  return cliOptions;
}

/**
 * Set a nested value in an object using a dot notation
 *
 * @param obj - The object to set the value in
 * @param key - The key to set the value in, using a dot notation, for example, 'a.b.c' should result into object with
 *   nested properties a, a.b and a.b.c
 * @param value - The value to set
 */
function setNestedValue(obj: NetconfType, key: string, value: string): void {
  const keys = key.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current.hasOwnProperty(keys[i]) || typeof current[keys[i]] !== 'object' || current[keys[i]] === null) {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as NetconfType;
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * Get connection arguments from environment or command line arguments or connection string
 * Command line arguments override environment variables.
 * Connection string overrides command line arguments.
 *
 * @param opt - Command line options
 * @param connStr - Connection string, if present in command line arguments
 * @returns Connection arguments
 */
function getConnectionArgs(opt: getoptsImport.ParsedOptions, connStr?: string): ConnArgs {
  const envConfig = removeUndefined({
    host: process.env.NETCONF_HOST,
    port: process.env.NETCONF_PORT ? parseInt(process.env.NETCONF_PORT, 10) : undefined,
    user: process.env.NETCONF_USER,
    pass: process.env.NETCONF_PASS,
  });

  const connConfig = connStr ? removeUndefined(parseConnStr(connStr)) : {};

  const argsConfig = removeUndefined({
    host: opt.host,
    port: opt.port,
    user: opt.user,
    pass: opt.pass,
  });


  const config = {
    ...envConfig,
    ...argsConfig,
    ...connConfig,
  };

  if(!config.host) {
    throw new Error('Host is not provided. Use -H flag, NETCONF_HOST environment variable, or connection string.');
  }
  return {
    host: config.host as string,
    port: config.port as number,
    user: config.user as string,
    pass: config.pass as string,
  };
}

function removeUndefined(obj: Record<string, string | number | undefined>): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Record<string, string | number>;
}