import { NetconfType } from '../lib/index.ts';

/**
 * Finds the first object in the object hierarchy that matches the key
 * @param obj - The object to search
 * @param key - The key to search for
 *
 * @returns The object, wrapping the first object that matches the key, if found only one such object,
 *          or the number of objects found, if there are multiple or none.
 */
function findDeep(obj: NetconfType, key: string): { found: NetconfType, key?: string} | number {
  if (typeof obj !== 'object' || obj === null) return 0;
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    return {found: { [key]: obj[key] }};
  }
  let nFound=0;
  let ret;
  for (const k of Object.keys(obj)) {
    if (Array.isArray(obj[k])){
      ret = {found: {[k]: obj[k]}, key: k};
      nFound++;
      break;
    }
    const found = findDeep(obj[k] as NetconfType, key);
    if (typeof found === 'object') {
      nFound++;
      ret = found;
    }
  }
  if(nFound === 1) return ret ?? 0;
  return nFound;
}

/**
 * Cleans the XPath string to make it easier to parse
 * @param xpath - The XPath string to clean
 * @returns The cleaned XPath string
 */
function cleanXPath(xpath: string): string {
  // convert wildcard to *
  xpath = xpath.replace(/\/\//g, '/*/');
  // merge */* into *
  xpath = xpath.replace(/\*\/\*/g, '*');
  // remove leading /
  xpath = xpath.replace(/^\/+/, '');

  // remove any predicates/matching square brackets from the xpath
  const regExp = /\[[^[\]]*]/;
  while(regExp.test(xpath)){
    xpath = xpath.replace(regExp, '');
  }
  return xpath;
}
/**
 * The function will return the requested object by stripping the parent objects from the object returned from
 * the Netconf,matching the XPath, leaving only the last object. Therefore the actual object is returned without
 * the root path. For example, if XPath is //aaa//user[name="admin"]/homedir, the function will return the object
 * that contains the homedir value:
 * {
 *   homedir: '/home/admin'
 * }
 *
 * @param {object} obj - Config object returned by Netconf when queried with XPath filter
 * @param {string} xpath - XPath string
 * @returns The object stripped of the XPath tokens, that is if XPath is /aaa/authentication/users/user[name="admin"]/homedir,
 *     the function will return the object that contains the homedir value
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function resolveXPath(obj: NetconfType | undefined, xpath: string): NetconfType | undefined {
  if (obj === undefined) return undefined;
  if (xpath.includes('|')) return obj;
  xpath = cleanXPath(xpath);
  if(!xpath) return obj;

  const pathParts = xpath.split('/');
  let current: NetconfType = obj;
  let lastKey: string | null = null;
  let lastResolved: NetconfType = obj;
  let isDeep = false;

  for (const part of pathParts) {
    if (part === '*') {
      isDeep = true;
      continue;
    }

    if (isDeep) {
      const found = findDeep(current, part);
      if (typeof found === 'number') return lastKey ? { [lastKey]: lastResolved } : obj;
      current = found.found[found.key ?? part] as NetconfType;
      lastKey = found.key ?? part;
      lastResolved = current;
      isDeep = false;
      continue;
    }

    if (
      typeof current === 'object' &&
      current !== null &&
      Object.prototype.hasOwnProperty.call(current, part)
    ) {
      lastKey = part;
      lastResolved = current[part] as NetconfType;
      current = current[part] as NetconfType;
    } else {
      return lastKey ? { [lastKey]: lastResolved } : obj;
    }
  }

  return lastKey ? { [lastKey]: lastResolved } : obj;
}
