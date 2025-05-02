/* eslint-disable @typescript-eslint/no-magic-numbers */
let supported = false;
try {
  supported = process && process.stdout && typeof process.stdout.hasColors === 'function'
    ? process.stdout.hasColors()
    : false;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (e: unknown) {
  supported = false;
}

const styleMap: Record<string, number[]> = {
  reset: [0, 0],

  bold: [1, 22],
  dim: [2, 22],
  italic: [3, 23],
  underline: [4, 24],
  overline: [53, 55],
  inverse: [7, 27],
  hidden: [8, 28],
  strikethrough: [9, 29],

  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  white: [37, 39],
  grey: [90, 39],
};

export type StyleName = keyof typeof styleMap;

// Create a cache for wrapped functions
const wrapCache: Record<StyleName, (s: string) => string> = {};


const wrap = (style: StyleName): ((s: string) => string) => {
  // Return cached function if it exists
  if (wrapCache[style]) {
    return wrapCache[style];
  }

  // Create and cache new function if it doesn't exist
  const wrappedFn = (s: string): string => `\u001B[${styleMap[style][0]}m${s}\u001B[${styleMap[style][1]}m`;
  wrapCache[style] = wrappedFn;
  return wrappedFn;
};

export const reset = supported ? wrap('reset') : (s: string) => s;
export const bold = supported ? wrap('bold') : (s: string) => s;
export const dim = supported ? wrap('dim') : (s: string) => s;
export const italic = supported ? wrap('italic') : (s: string) => s;
export const underline = supported ? wrap('underline') : (s: string) => s;
export const overline = supported ? wrap('overline') : (s: string) => s;
export const inverse = supported ? wrap('inverse') : (s: string) => s;
export const hidden = supported ? wrap('hidden') : (s: string) => s;
export const strikethrough = supported ? wrap('strikethrough') : (s: string) => s;

export const black = supported ? wrap('black') : (s: string) => s;
export const red = supported ? wrap('red') : (s: string) => s;
export const green = supported ? wrap('green') : (s: string) => s;
export const yellow = supported ? wrap('yellow') : (s: string) => s;
export const blue = supported ? wrap('blue') : (s: string) => s;
export const magenta = supported ? wrap('magenta') : (s: string) => s;
export const cyan = supported ? wrap('cyan') : (s: string) => s;
export const white = supported ? wrap('white') : (s: string) => s;
export const grey = supported ? wrap('grey') : (s: string) => s;

/**
 * Given the string and the array of styles, return the string with the styles applied
 *
 * @param s - The string to apply the styles to
 * @param fmt - The array of styles to apply
 * @returns The string with all the styles applied
 */
export const styleFormat = (s: string, fmt: StyleName | StyleName[]): string => {
  if (!s) return '';
  if(!supported || !fmt) return s;

  if(typeof fmt === 'string' && styleMap[fmt]){
    return wrap(fmt)(s);
  }

  if (Array.isArray(fmt) && fmt.length > 0) {
    return fmt.reduceRight(
      (acc, curr) => typeof curr === 'string' && styleMap[curr]
        ? wrap(curr)(acc)
        : acc,
      s
    );
  }
  return s;
};
