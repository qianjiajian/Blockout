/**
 * Clone the plain data used by levels and saves into mutable objects.
 * Preserves aliases, cycles, sparse arrays and enumerable own data properties.
 * This is deliberately not a general-purpose structuredClone replacement:
 * non-plain objects, symbols, functions and enumerable accessors are rejected.
 */
export function clonePlainData<T>(value: T): T {
  const copies = new WeakMap<object, object>();

  const clone = (input: unknown): unknown => {
    if (input === null || input === undefined) return input;
    const kind = typeof input;
    if (kind === "string" || kind === "boolean" || kind === "number") return input;
    if (kind !== "object") throw new TypeError(`clonePlainData does not support ${kind} values`);

    const source = input as object;
    const existing = copies.get(source);
    if (existing) return existing;
    const array = Array.isArray(source);
    const prototype = Object.getPrototypeOf(source);
    if (!array && prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("clonePlainData only supports arrays and plain objects");
    }
    for (const symbol of Object.getOwnPropertySymbols(source)) {
      if (Object.getOwnPropertyDescriptor(source, symbol)?.enumerable) {
        throw new TypeError("clonePlainData does not support enumerable symbol properties");
      }
    }

    const result: object = array ? new Array((source as unknown[]).length) : {};
    copies.set(source, result);
    for (const key of Object.keys(source)) {
      const descriptor = Object.getOwnPropertyDescriptor(source, key)!;
      if (!("value" in descriptor)) {
        throw new TypeError("clonePlainData does not support enumerable accessor properties");
      }
      // defineProperty keeps '__proto__' as ordinary data and makes frozen
      // source properties writable without invoking inherited setters.
      Object.defineProperty(result, key, {
        value: clone(descriptor.value),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    return result;
  };

  return clone(value) as T;
}
