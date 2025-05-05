
# Netconf Console App

A command-line application for interacting with Netconf/ConfD servers.

This intuitive CLI lets you easily read and edit server configurations using XPath expressions.

- [Features](#features)
- [Installation](#installation)
- [Usage Examples](#usage-examples)
  - [Quick start](#quick-start)
  - [Custom RPC](#custom-rpc)
  - [Edit config (merge)](#edit-config-merge)
  - [Edit config (create)](#edit-config-create)
  - [Edit config (create list items)](#edit-config-create-list-items)
  - [Edit config (delete)](#edit-config-delete)
  - [Subscribe to notifications](#subscribe-to-notifications)
  - [Scripting](#scripting)
- [Flags and Options](#flags-and-options)
- [Environment Variables](#environment-variables)
- [License](#license)

## Features

- **XPath expressions** for flexible leaf selection
- **Custom RPC** - execute arbitrary RPCs
- **Subscriptions** - subscribe to ConfD notifications
- **Multiple output formats** - JSON, XML, YAML, key-value, tree
- **Tree view** - for easier viewing of the configuration

## Installation

Install globally with:
```sh
npm install -g netconf-client
```

## Usage Examples

### Quick start

Query configuration or state data with:

```sh
netconf user:pass@host:port /xpath
```
For example, to get the ConfD version:
```sh
netconf admin:admin@localhost:2022 /confd-state/version
```

To get the list of users:
```sh
netconf admin:admin@localhost:2022 //aaa//users
```

**Note:** The default username and password are `admin:admin`. The default port is `2022`.


### Custom RPC

To execute a custom RPC, provide the command path (as an XPath expression) and any required parameters. 
Use dot-separated keys for nested parameters (see an example below). The special key `$` is used to specify attributes of the element.

For example, to get the list of users (will produce a similar result as above):

```sh
netconf localhost rpc /get filter.$.type=xpath filter.$.select='//aaa//users'
```

To copy the running configuration to startup:
```sh
netconf localhost rpc /copy-config source.running= target.startup=

# This produces the following XML request to the server:
<rpc message-id="1" xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">
  <copy-config>
    <source>
      <running/>
    </source>
    <target>
      <startup/>
    </target>
  </copy-config>
</rpc>
```

**Note:** Use the -n flag to specify a namespace if required.


### Edit config (merge)

Change the admin password:
```sh
netconf localhost -n http://tail-f.com/ns/aaa/1.1 /aaa/authentication/users/user \
    name=admin password=admin
```

### Edit config (create)

Create a new user:

```sh
netconf localhost -n http://tail-f.com/ns/aaa/1.1 /aaa/authentication/users/user \
    add name=user password=user ssh_keydir='/var/confd/homes/user/.ssh' \
    uid=100 gid=9000 homedir=/var/confd/homes/user
```

### Edit config (create list items)

Add a new user with username 'user' to the list of users in the 'oper' group using list syntax. List items are provided
in square brackets, separated by commas.
```sh
netconf localhost -n urn:ietf:params:xml:ns:yang:ietf-netconf-acm '/nacm/groups/group[name="oper"]/user-name' add [user] 
```

### Edit config (delete)

Delete a user:
```sh
netconf localhost -n http://tail-f.com/ns/aaa/1.1 /aaa/authentication/users/user del name=user
```

### Subscribe to notifications
```sh
netconf localhost sub '/'
```

### Scripting

Use `--keyvalue` flag to output the result as key-value pairs for easy parsing.

For example:
```sh
netconf localhost /confd-state/version --keyvalue
```

will output:
```
version=5.5.1
```



## Flags and Options

- `-H`, `--host`            - Netconf host
- `-U`, `--user`            - Username (default: admin)
- `-P`, `--password`        - Password (default: admin)
- `-p`, `--port`            - Netconf port (default: 2022)
- `-n`, `--namespace`       - Add namespace to the request
- `-j`, `--json`            - Output as JSON
- `-x`, `--xml`             - Output as XML
- `-y`, `--yaml`            - Output as YAML
- `-k`, `--keyvalue`        - Output as key-value pairs
- `-f`, `--full-tree`       - Output the complete requested object tree (by default only the requested leaf is output)
- ...and more (use `netconf --help` for full list)

## Environment Variables

- `NETCONF_HOST`, `NETCONF_USER`, `NETCONF_PASS`, `NETCONF_PORT`, `NETCONF_NAMESPACE`

For more details, run:
```sh
netconf --help
```

## License

This project is licensed under the [MIT License](LICENSE).
