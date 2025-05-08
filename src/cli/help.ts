import { basename } from 'path';
import { bold, cyan, green } from './output-colors.ts';
import { DEFAULT_PASS, DEFAULT_PORT, DEFAULT_USER, DEFAULT_XPATH } from './parse-args.ts';

export function showHelp(): void {
  /**
   * Print help/usage message
   */
  const exe = basename(process.argv[1]);
  console.info(`${cyan('Commands:')}

  Execute ${bold('get')} on running configuration (default XPATH: ${DEFAULT_XPATH}):
    ${green(`${exe} [FLAGS] [CONN_STR] [XPATH]`)}

  Execute edit-config with ${bold('merge')} operation:
    ${green(`${exe} [FLAGS] [CONN_STR] [XPATH] [var=val] [var=val] [...]`)}

  Execute edit-config with ${bold('create')} operation:
    ${green(`${exe} [FLAGS] [CONN_STR] [XPATH] add [var=val] [var=val] [...]`)}
    ${green(`${exe} [FLAGS] [CONN_STR] [XPATH] add LIST_ITEMS`)}

  Execute edit-config with ${bold('delete')} operation:
    ${green(`${exe} [FLAGS] [CONN_STR] [XPATH] del [var=val]`)}
    ${green(`${exe} [FLAGS] [CONN_STR] [XPATH] del LIST_ITEMS`)}

  Execute ${bold('rpc')} operation:
    ${green(`${exe} [FLAGS] [CONN_STR] [XPATH] rpc`)}

  Subscribe to notifications (default XPATH: ${DEFAULT_XPATH}):
    ${green(`${exe} [FLAGS] [CONN_STR] [XPATH|STREAM] sub`)}
  
${cyan('Flags:')}
      --allow-multiple    - allow multiple schema branches to be edited in a single operation
  -b, --before-key        - print the new key before the specified key (for ${bold('add')} operation). See examples below.
      --config-only       - print only the configuration
  -f, --full-tree         - display the complete result tree (only the requested object is shown by default)
      --hello             - print hello message and exit
  -h, --help              - this help
  -H, --host              - Netconf host
  -j, --json              - print result in JSON format
  -P, --password          - password (default: ${DEFAULT_PASS})
  -p, --port              - Netconf port number (default: ${DEFAULT_PORT})
      --read-only         - only read the data from the server, no edit-config operations
      --schema-only       - print only the schema
  -s, --show-namespaces   - show namespaces in the result (enables --full-tree)
      --state-only        - print only the state
      --stdin             - read key-value pairs for edit-config operations from stdin instead of list of arguments;
                              the key-value pairs are expected to be in the format of key=value, one per line;
                              provide nested properties separated by /, for example: leaf/subleaf=value
  -U, --user              - username (default: ${DEFAULT_USER})
  -v, --version           - version of the script
  -V, --verbose           - verbose output, use multiple times for more verbosity
                            -V prints progress of the operation
                            -VV prints Netconf message exchange between client and server (except Hello messages)
                            -VVV prints the SSH debug messages (and Hello messages)
  -x, --xml               - print result in XML format
      --xmlns             - add namespace to the request. Can be specified multiple times with namespace alias separated
                              by colon, for example: --xmlns=http://example.com/ns1 --xmlns:x=http://example.com/ns2
                              If not provided, the client will try to guess it by querying the server.
  -y, --yaml              - print result in YAML format
  CONN_STR                - remote host connection string in the form of user:pass@host:port
  XPATH                   - XPath filter, must start with / (default: ${DEFAULT_XPATH})
  upd|add|del|rep|sub|rpc - operation to be performed (default: get)
                              upd: edit-config with ${bold('merge')} operation, key is required (default)                          
                              add: edit-config with ${bold('create')} operation, key is required
                              del: edit-config with ${bold('delete')} operation, key is required
                              rep: edit-config with ${bold('replace')} operation, key is required
                              sub: ${bold('subscribe')} to notifications
                              rpc: execute a Netconf ${bold('RPC')}; provide RPC command as XPath ${bold('without wildcards')}
                              N.B.: If no operation is provided, ${bold('get')} and ${bold('merge')} are assumed
  var=val                 - leaf name and value to be set on the selected object. Relevant for edit-config and RPC
                              operations.
  LIST_ITEMS              - values to be added/deleted on the selected list (array), enclosed in square brackets,
                              for example: "[value1, value2, value3]"

${cyan('Examples:')}
  Query the running configuration for the user list
      ${green('${exe} netconf-host /aaa//users')}

  Create a new user (${bold('operation: merge')}) with username 'user' and password 'pass'. The AAA namespace is specified
  using the --xmlns flag.
      ${green(`${exe} user:pass@netconf-host:2022 --xmlns=http://tail-f.com/ns/aaa/1.1 \\
      /aaa/authentication/users/user \\
      name=user password=pass ssh_keydir='/var/confd/homes/user/.ssh' uid=100 gid=9000 homedir=/var/confd/homes/user`)}

  Create a new NACM rule (${bold('operation: add')}) with name 'user' that allows read access to all interfaces.
  The new rule is inserted before the 'oper' rule. Namespace is not provided, so the app will attempt to determine
  it by querying the server.
      ${green(`${exe} <HOST> '/nacm/rule-list[name="user"]/rule' add name=if module-name=ietf-interfaces \\
      path=/interfaces access-operations=read action=permit -b '[name="oper"]'`)}

  Add a new user (${bold('operation: add')}) with username 'user' to the list of users in the 'oper' group using ${bold('list')} syntax.
      ${green(`${exe} localhost '//groups/group[name="oper"]/user-name' add [user]`)}

  Call a Netconf RPC to copy the running configuration to startup:
      ${green(`${exe} localhost rpc '/copy-config' source/running= target/startup=`)}

  Subscribe to notifications:
      ${green(`${exe} localhost sub /`)}


${cyan('Environment Variables:')}
  NETCONF_HOST - Netconf host
  NETCONF_USER - Netconf user
  NETCONF_PASS - Netconf password
  NETCONF_PORT - Netconf port
  NETCONF_NAMESPACE - Netconf namespace
`);
}
