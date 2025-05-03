import { map, Observable, of } from 'rxjs';
import { NetconfType, SafeAny } from './netconf-types.ts';

/**
 * Build a configuration object for Netconf edit-config RPC based on the XPath filter.
 * The class takes the XPath filter and the schema observable and builds the configuration object
 * that can be used in edit-config RPC.
 */
export class NetconfBuildConfig {
  private xpath: string;

  private schema?: Observable<NetconfType>;

  private targetNamespace?: string;

  /**
   * Create a new BuildEditConfig object.
   *
   * @param {string} xpath - XPath filter of the configuration object,
   *   for example, //interfaces/interface[name="eth1"]
   * @param {Observable<NetconfType>} schema - Observable that emits the schema of the device.
   *   The class may use it if the XPath filter is not straightforward.
   * @param {string} targetNamespace - Optional target namespace for the configuration object.
   */
  public constructor(xpath: string, schema?: Observable<NetconfType>, targetNamespace?: string) {
    xpath = xpath.trim();
    if(!xpath || xpath === '/' || xpath === '//'){
      throw new Error('XPath for edit-config must contain at least one element');
    }
    if(xpath.includes('|')){
      throw new Error('XPath for edit-config must not contain |');
    }
    this.xpath = xpath;
    this.schema = schema;
    this.targetNamespace = targetNamespace;
  }


  /**
   * Build a configuration object for Netconf edit-config RPC. The function will return an array of configuration
   * objects, that is, the object where configuration must be updated according to the xpath filter.
   * For example, if Xpath filter is //interfaces/interface[name="eth1"], the function will return an array of
   * objects, containing the interface with name eth1 (array of one object).
   *
   * @param {NetconfType} targetObj - The root configuration object from which to build the configuration based
   *   on the XPath filter.
   *
   * @returns {NetconfType[]} Array of objects where configuration must be updated, for example,
   *   for the XPath //interfaces/interface[name="eth1"], the function will return an array of one object
   *   containing the interface with name eth1. The returned objects are nested in the targetObj.
   *   The function returns an empty array if:
   *   - the schema is not provided.
   *   - the XPath filter cannot be matched with schema of XPath
   */
  public build(targetObj: NetconfType): Observable<NetconfType[]> {
    if(!(this.xpath.includes('//') || this.xpath.includes('*'))){
      // Try to build based on XPath
      const result = this.buildFromXPath(targetObj);
      if(result !== undefined){
        return of(result);
      }
    }
    if(this.schema){
      return this.buildFromSchema(this.schema, targetObj);
    }
    return of([]);
  }

  /**
   * Build a configuration object for Netconf edit-config RPC based on the XPath filter. The function will
   * attempt to build the configuration object from the XPath provided. If the XPath has features not supported
   * by the function, the function will return undefined. The function only supports full XPath with
   * predicates for matching nodes.
   *
   * @param {NetconfType} targetObj - The root configuration object from which to build the configuration based
   *   on the XPath filter.
   *
   * @returns {NetconfType[] | undefined} Array including the configuration object that needs to be updated.
   */
  private buildFromXPath(targetObj: NetconfType): NetconfType[] | undefined {
    // Split the XPath filter into tokens
    const xpathSegments = this.xpath.split('/').filter(x => x !== '');
    let current = targetObj;

    for (let i = 0; i < xpathSegments.length; i++) {
      const seg = xpathSegments[i];
      const match = seg.match(/^([\w.:\-]+)(?:\[([^=@]+)=(["'])([^"'\]]+)\3])?$/);

      if (!match) return undefined;

      const [, tag, predKey, , predVal] = match;
      current[tag] = i === 0 && this.targetNamespace
        ? { $: { xmlns: this.targetNamespace } }
        : {};

      if (predKey && predVal) {
        current[tag][predKey] = predVal;
      }

      current = current[tag];
    }

    return [current];
  }

  /**
   * Build a configuration object for Netconf edit-config RPC based on the schema. The function will
   * request the schema from the server using the xpath filter and build the configuration object based on the schema.
   *
   * @param {NetconfType} targetObj - The root configuration object from which to build the configuration based
   *   on the XPath filter.
   *
   * @returns {NetconfType[]} Array of objects where configuration must be updated.
   */
  private buildFromSchema(schema: Observable<NetconfType>, targetObj: NetconfType): Observable<NetconfType[]> {
    // remove leading / or //
    let xpath = this.xpath.replace(/^\/+/, '');
    // convert wildcard to *
    xpath = xpath.replace(/\/\//g, '/*/');
    // merge */* into *
    xpath = xpath.replace(/\*\/\*/g, '*');

    // remove any predicates/matching square brackets from the xpath
    const regExp = /\[[^[\]]*]/;
    while(regExp.test(xpath)){
      xpath = xpath.replace(regExp, '');
    }
    const xpathSegments = xpath.split('/');

    return schema.pipe(
      map((schemaObj: NetconfType) => {
        // Deep copy schema into targetObj
        Object.assign(targetObj, structuredClone(schemaObj));
        // match the schema with the xpath and return the config parts
        return this.findConfigPartsInSchema(targetObj, xpathSegments);
      }),
    );
  }

  private findConfigPartsInSchema(schema: NetconfType, xpathSteps: string[]): NetconfType[] {
    const configParts: NetconfType[] = [];

    // Helper function to recursively search the schema
    // eslint-disable-next-line sonarjs/cognitive-complexity
    const searchSchema = (currentObj: NetconfType, steps: string[], step: number): boolean => {
      if(steps.length === 0){
        this.stripNestedObjects(currentObj);
        configParts.push(currentObj);
        return true;
      }

      if(steps.length === 1 && steps[0] === '*' && !Array.isArray(currentObj)){
        this.stripNestedObjects(currentObj);
        configParts.push(currentObj);
        return true;
      }

      if(typeof currentObj !== 'object' || currentObj === null) {
        return false;
      }

      // Iterate through the properties of currentObj
      let branchPassed = false;
      for(const key of Object.keys(currentObj)){
        const isWildcardMatch = steps[0] === '*' && steps.length > 1 && key === steps[1];

        // let twigPassed = false;
        if(key === steps[0] || isWildcardMatch){
          const newSteps = isWildcardMatch ? steps.slice(1) : steps;
          // If this is out object, but it is an array, convert it to an object
          if(newSteps.length === 1 && Array.isArray(currentObj[key])){
            currentObj[key] = {};
          }
          branchPassed = searchSchema(currentObj[key] as NetconfType, newSteps.slice(1), step + 1) || branchPassed;
        }else if(steps[0] === '*' && steps.length === 1){
          branchPassed = searchSchema(currentObj[key] as NetconfType, [], step + 1) || branchPassed;
        }else{
          branchPassed = searchSchema(currentObj[key] as NetconfType, steps, step + 1) || branchPassed;
        }

        if (!branchPassed && (Array.isArray(currentObj[key]) || typeof currentObj[key] === 'object')) {
          delete currentObj[key];
        }
      }
      if(step === 1 && this.targetNamespace){
        currentObj.$ = {
          ...currentObj.$ ?? {} as SafeAny,
          xmlns: this.targetNamespace,
        };
      }
      return branchPassed;
    };

    // Start the recursive search
    searchSchema(schema, xpathSteps, 0);
    return configParts;
  }

  private stripNestedObjects = (obj: NetconfType): void => {
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        if (obj[key] && typeof obj[key] === 'object') {
          delete obj[key];
        }
      });
    }
  };
}