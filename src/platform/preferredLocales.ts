export const filteredRawLocales = (values: readonly unknown[]): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string" || value.trim().length === 0 || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
};
