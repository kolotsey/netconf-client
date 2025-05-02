import { basename } from 'path';
import { bold, cyan, green } from './output-colors';
import { DEFAULT_PASS, DEFAULT_PORT, DEFAULT_USER, DEFAULT_XPATH } from './parse-args';

export function showHelp(): void {
  /**
   * Print help/usage message
   */
  const exe = basename(process.argv[1]);
  console.info(`${cyan('Commands:')}

  Execute ${bold('get')} on running configuration (default XPATH: ${DEFAULT_XPATH}):
    ${green(`${exe} [FLAGS] [CONN_STR] [XPATH]`)}

  Execute edit-config with ${bold('merge')} operation:
    ${green(`${exe} [FLAGS] [CONN_STR] [XPATH] [var=val|array] [var=val|array] [...]`)}

  Execute edit-config with ${bold('create')} operation:
    ${green(`${exe} [FLAGS] [CONN_STR] [XPATH] add [var=val|array] [var=val|array] [...]`)}

  Execute edit-config with ${bold('delete')} operation:
    ${green(`${exe} [FLAGS] [CONN_STR] [XPATH] del [var=val]`)}

  Execute ${bold('rpc')} operation:
    ${green(`${exe} [FLAGS] [CONN_STR] [XPATH] rpc`)}

  Subscribe to notifications (default XPATH: ${DEFAULT_XPATH}):
    ${green(`${exe} [FLAGS] [CONN_STR] [XPATH/STREAM] sub`)}
  
${cyan('Flags:')}
      --allow-multiple  - allow multiple schema branches to be edited in a single operation
  -b, --before-key      - print the new key before the specified key (for ${bold('add')} operation). See examples below.
      --config-only     - print only the configuration
  -f, --full-tree       - print the full tree of the result (only requested object printed by default for get operation)
      --hello           - print hello message and exit
  -h, --help            - this help
  -H, --host            - Netconf host
  -j, --json            - print result in JSON format
  -n, --namespace       - add namespace to the request
  -P, --password        - password (default: ${DEFAULT_PASS})
  -p, --port            - Netconf port number (default: ${DEFAULT_PORT})
      --read-only       - only read the data from the server, no edit-config operations
      --schema-only     - print only the schema
  -s, --show-namespaces - show namespaces in the result (enables -f)
      --state-only      - print only the state
  -U, --user            - username (default: ${DEFAULT_USER})
  -v, --version         - version of the script
  -V, --verbose         - verbose output, use multiple times for more verbosity
                          -V prints progress of the operation
                          -VV prints Netconf message exchange between client and server (except Hello messages)
                          -VVV prints the SSH debug messages (and Hello messages)
  -x, --xml             - print result in XML format
  -y, --yaml            - print result in YAML format
  CONN_STR              - remote host connection string in the form of user:pass@host:port
  XPATH                 - XPath filter, must start with / (default: ${DEFAULT_XPATH})
  add|del|upd|sub|rpc   - operation to be performed (default: get)
                            add|cre: ${bold('create')} a new object, key is required
                            del|rem: ${bold('delete')} an object, key is required
                            upd: ${bold('update')} an object, key is required
                            sub: subscribe to notifications
                            rpc: execute a Netconf RPC; provide RPC command as XPath ${bold('without wildcards')}
                            if no operation is provided, get and merge are assumed
  var=val               - leaf name and value to be set on the selected object. Relevant for ${bold('create')} and ${bold('update')}
                            operations.
  array                 - array of values to be added/deleted on the selected list.

${cyan('Examples:')}
  Query the running configuration for the 'lan' interface
      ${green('${exe} netconf-host //interface[name="lan"]')}

  Create a new user with username 'user' and password 'pass'. The edit-config operation requires the -n flag to specify
  the AAA namespace.
      ${green(`${exe} admin:admin@netconf-host:2022 -n http://tail-f.com/ns/aaa/1.1 /aaa/authentication/users/user \\
      add name=user password=pass ssh_keydir='/var/confd/homes/user/.ssh' \\
      uid=100 gid=9000 homedir=/var/confd/homes/user`)}

  Create a new NACM rule with name 'user' that allows read access to all interfaces. The new rule is inserted before
  the 'oper' rule.
      ${green(`${exe} <HOST> -n urn:ietf:params:xml:ns:yang:ietf-netconf-acm \\
      '/nacm/rule-list[name="user"]/rule' add name=if module-name=interfaces \\
      path=/interfaces access-operations=read action=permit -b '[name="oper"]'`)}

${cyan('Environment Variables:')}
  NETCONF_HOST - Netconf host
  NETCONF_USER - Netconf user
  NETCONF_PASS - Netconf password
  NETCONF_PORT - Netconf port
  NETCONF_NAMESPACE - Netconf namespace
`);
}
