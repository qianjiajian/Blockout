export const SELF = 'tools/daily-challenge/formal-v4/static-star-stock-ids-v1.mjs';
export const VERSION = 'static-star-stock-global-id-preflight-v1';

function reject(code, message, details) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

/** ID-only metadata preflight. It creates no LevelSpec/model and invokes no
 * callbacks. Callers must run it before history/model work; this module does
 * not wire or grant authority to any production entry point.
 */
export function assertStaticStarStockIds(stock) {
  if (!stock || !Array.isArray(stock.inventory) || !Array.isArray(stock.gates)) {
    reject('STATIC_STAR_STOCK_ID_DOMAIN', 'inventory and gates must be arrays', {});
  }
  const seen = new Set(), origins = new Map();
  for (const kind of ['inventory', 'gates']) {
    for (let index = 0; index < stock[kind].length; index++) {
      const id = stock[kind][index]?.id;
      if (typeof id !== 'string' || id.trim().length === 0) {
        reject('STATIC_STAR_STOCK_INVALID_ID', `${kind}[${index}].id must be a nonempty string`, { kind, index });
      }
      if (seen.has(id)) {
        const first = origins.get(id);
        reject('STATIC_STAR_STOCK_DUPLICATE_ID', `Duplicate stock id ${id}: ${first.kind}[${first.index}] and ${kind}[${index}]`, {
          id, first, duplicate: { kind, index }, crossEntity: first.kind !== kind,
        });
      }
      seen.add(id);
      origins.set(id, { kind, index });
    }
  }
  return {
    version: VERSION,
    inventoryCount: stock.inventory.length,
    gateCount: stock.gates.length,
    totalIds: stock.inventory.length + stock.gates.length,
    uniqueIds: seen.size,
  };
}
