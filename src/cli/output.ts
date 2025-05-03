import { red, dim, styleFormat, StyleName } from './output-colors.ts';

export class Output {
  public static set verbosity(verbosity: number) {
    this._verbosity = verbosity;
    if(this._verbosity > 0){
      this.debug = this._debug;
    }else{
      this.debug = () => {};
    }
  }

  public static get verbosity(): number {
    return this._verbosity;
  }

  public static debug:((msg: string, src?: string, level?: number) => void) = () => {};

  public static error(message: string): void {
    process.stderr.write(red(`${message}\n`));
  }

  public static printStackTrace(error?: Error): void {
    if(this.verbosity > 0){
      if (!error) {
        error = new Error();
      }
      const stack = error.stack;
      if (stack) {
        process.stderr.write(dim(`${stack}\n`));
      }
    }
  }

  public static info(message: string, textFormat?: StyleName | StyleName[]): void {
    if(textFormat){
      process.stderr.write(`${styleFormat(message, textFormat)}\n`);
    }else{
      process.stderr.write(`${message}\n`);
    }
  }

  private static _verbosity = 0;

  /**
   * Debug function
   *
   * @param message - Message to debug
   * @param source - Source/tag of the message
   */
  private static _debug(message: string, source?: string, level?: number): void {
    if(level && level > this._verbosity){
      return;
    }
    if (source) {
      process.stderr.write(dim(`${source}: ${message}\n`));
    } else {
      process.stderr.write(dim(`${message}\n`));
    }
  }
}
