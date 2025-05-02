/**
 * Regex for user:pass@host:port
 */
const CONN_STR_REGEX = /^(?:([^\s:@]+)(?::([^\s@]+))?@)?([\w.-]+)(?::(\d{1,5}))?$/;

/**
 * Connection string object
 */
export interface ConnArgs extends Record<string, string | number | undefined> {
  host: string;
  port?: number;
  user?: string;
  pass?: string;
}


const MAX_HOST_LENGTH = 255;
const MAX_PORT_NUMBER = 65535;

/**
 * Parse user:pass@host:port connection string
 *
 * @param conn - Connection string in the format of user:pass@host:port where only host is required. If some of the
 *   parameters are not provided, they will be undefined.
 *
 * @returns Connection string object
 */
export function parseConnStr(conn: string): ConnArgs {
  // Parse conn str using regexp
  const match = conn.match(CONN_STR_REGEX);
  if (!match) {
    throw new Error('Invalid connection string. Connection string must be in the form of user:pass@host:port');
  }
  const user = match[1] ?? undefined;
  const pass = match[2] ?? undefined;
  const host = match[3];
  const port = match[4] ? parseInt(match[4], 10) : undefined;

  if (host.length > MAX_HOST_LENGTH) {
    throw new Error(`Host name too long, max length is ${MAX_HOST_LENGTH}`);
  }
  if (port && port > MAX_PORT_NUMBER) {
    throw new Error(`Invalid port number, must be between 0 and ${MAX_PORT_NUMBER}`);
  }

  return { host, port, user, pass };
}

