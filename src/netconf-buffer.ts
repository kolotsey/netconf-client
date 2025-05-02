
// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const NETCONF_MAX_BUFFER_SIZE = 50 * 1024 * 1024;
export const NETCONF_DELIM = ']]>]]>';

export class NetconfBuffer {
  private buffer: Buffer = Buffer.from('');

  public append(chunk: Buffer): boolean {
    if (this.buffer.length + chunk.length > NETCONF_MAX_BUFFER_SIZE) {
      return false;
    }
    this.buffer = Buffer.concat([this.buffer, chunk]);
    return true;
  }

  public extract(): string | undefined {
    const pos = this.buffer.indexOf(NETCONF_DELIM);
    if (pos === -1) {
      return undefined;
    }
    const message = this.buffer.subarray(0, pos).toString();
    this.buffer = this.buffer.subarray(pos + NETCONF_DELIM.length);
    return message;
  }

  public clear(): void {
    this.buffer = Buffer.from('');
  }

  public toString(): string {
    return this.buffer.toString();
  }
}
