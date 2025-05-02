
# Netconf Console App

The project includes a CLI console application for interacting with Netconf/ConfD servers.

The app is intuitive and easy to use. It allows you to interact with the server - both for reading and editing the configuration - using XPath expressions.


- [Features](#features)
- [Installation](#installation)
- [Usage Examples](#usage-examples)
  - [Quick start](#quick-start)
  - [Custom RPC](#custom-rpc)
  - [Edit config (merge)](#edit-config-merge)
  - [Edit config (create)](#edit-config-create)
  - [Edit config (delete)](#edit-config-delete)
  - [Subscribe to notifications](#subscribe-to-notifications)
- [Flags and Options](#flags-and-options)
- [Environment Variables](#environment-variables)
- [License](#license)

## Features

- **XPath expressions**
- **Custom RPC** - execute arbitrary RPCs
- **Subscriptions** - subscribe to notifications
- **Multiple output formats** - JSON, XML, YAML, tree
- **Tree view** - for easier reading of the configuration

## Installation

To install globally, run:
```sh
npm install -g netconf-client
```

## Usage Examples

### Quick start

To query configuration or state data, use the following syntax:

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


### Custom RPC

To execute a custom RPC, provide the command path (as XPath expression) and parameters if needed. Nested parameters
should be provided as JSON objects. Special key `$` is used to specify attributes of the element.

For example, to get the list of users (will produce the same result as above):

```sh
netconf localhost rpc /get filter.$.type=xpath filter.$.select='//aaa//users'
```

To copy the running configuration to startup:
```sh
netconf localhost rpc /copy-config source.running= target.startup=

# Produces the following XML request to the server:
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

Don't forget to provide the namespace for the request, using `-n` flag, if needed.


### Edit config (merge)

Change admin password:
```sh
netconf admin:admin@localhost:2022 -n http://tail-f.com/ns/aaa/1.1 /aaa/authentication/users/user \
    name=admin password=admin
```

### Edit config (create)

Create a new user:

```sh
netconf admin:admin@localhost:2022 -n http://tail-f.com/ns/aaa/1.1 /aaa/authentication/users/user \
    add name=user password=user ssh_keydir='/var/confd/homes/user/.ssh' \
    uid=100 gid=9000 homedir=/var/confd/homes/user
```

### Edit config (delete)

Delete a user:
```sh
netconf admin:admin@localhost:2022 -n http://tail-f.com/ns/aaa/1.1 /aaa/authentication/users/user del name=user
```

### Subscribe to notifications:
```sh
netconf admin:admin@localhost:2022 sub '/'
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
- ...and more (use `netconf --help` for full list)

## Environment Variables

- `NETCONF_HOST`, `NETCONF_USER`, `NETCONF_PASS`, `NETCONF_PORT`, `NETCONF_NAMESPACE`

For more details, see `netconf --help`

## License

This project is licensed under the [MIT License](LICENSE).
