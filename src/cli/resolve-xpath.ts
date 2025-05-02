import { NetconfType } from '../netconf-types';

export function resolveXPath(obj: NetconfType | undefined, xpathStr: string): NetconfType | undefined {
  if(obj === undefined) return undefined;
  const xpathItems = xpathStr.split('/');
  if (xpathItems[0] === '') {
    xpathItems.shift();
  }
  return resolveXPathRecursive(obj, xpathItems);
}

/**
 * The function will return the requested object by stripping the object returned from the Netconf of the root items,
 * matching the XPath. Therefore the actual object is returned without the root path.
 * Not applicable for XPath containing wildcard (* or //).
 *
 * @param {object} obj - Config object returned by Netconf when queried with XPath filter
 * @param {string[]} xpathItems - Array of XPath tokens, for example if XPath is /aaa/authentication/users/user[name="admin"]/homedir,
 *     the array will be ['aaa', 'authentication', 'users', 'user', 'homedir']
 * @returns The object stripped of the XPath tokens, that is if XPath is /aaa/authentication/users/user[name="admin"]/homedir,
 *     the function will return the object that contains the homedir value
 */
function resolveXPathRecursive(obj: NetconfType, xpathItems: string[]): NetconfType {
  // If there are no more XPath items, return the object
  if (xpathItems.length === 0) return obj;
  // Get the next level item from the XPath, remove any XPath expression in square brackets
  const [levelItem, ...rest] = xpathItems;
  const level = levelItem.match(/[^[]+/)?.[0];
  // If the level does not exist (mistake), return the object
  if (!level || !obj.hasOwnProperty(level)) return obj;
  // otherwise call the function recursively with the next level
  return resolveXPathRecursive(obj[level] as NetconfType, rest);
}
