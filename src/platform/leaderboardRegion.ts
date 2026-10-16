import { normalizeLeaderboardProvince } from "../core/rankingProvince";
import { LEADERBOARD_IP_LOOKUP_TIMEOUT_MS, LEADERBOARD_IP_LOOKUP_URL } from "./leaderboardRegionConfig";

export interface LeaderboardProvinceResult { province: string; source: "ip" }
export type ProvinceRequest = (url: string, complete: (status: number, body: unknown) => void) => (() => void) | undefined;

const object = (raw: unknown): Record<string, unknown> | undefined =>
  raw != null && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : undefined;

export function provinceFromIpResponse(raw: unknown): LeaderboardProvinceResult | undefined {
  const data = object(raw);
  if (!data || (data.status !== undefined && data.status !== 0)) return undefined;
  const adInfo = object(object(data.result)?.ad_info);
  const fields = adInfo ?? data;
  // An explicit foreign result must not be mistaken for a same-named region.
  if (fields.nation_code !== undefined && ![156, 158, 344, 446].includes(Number(fields.nation_code))) return undefined;
  if (fields.nation !== undefined && !["中国", "中华人民共和国", "China", "中国香港", "中国澳门", "中国台湾", "香港", "澳门", "台湾"].includes(String(fields.nation))) return undefined;
  const adcode = adInfo && (typeof adInfo.adcode === "string" || typeof adInfo.adcode === "number") ? String(adInfo.adcode) : "";
  const province = normalizeLeaderboardProvince(fields.province)
    ?? (/^\d{6}$/.test(adcode) ? normalizeLeaderboardProvince(adcode) : undefined);
  return province ? { province, source: "ip" } : undefined;
}

/** Always settles, even if a native request never calls success/fail. Late
 * callbacks are ignored. Callers persist only the province code and source. */
export function resolveLeaderboardProvince(
  request: ProvinceRequest,
  endpoint = LEADERBOARD_IP_LOOKUP_URL,
  timeoutMs = LEADERBOARD_IP_LOOKUP_TIMEOUT_MS,
): Promise<LeaderboardProvinceResult | undefined> {
  // Native games need not expose the browser URL class.
  if (!/^https:\/\/[^\s/?#@:]+(?::\d+)?(?:[/?][^\s#]*)?$/.test(endpoint)) return Promise.resolve(undefined);
  return new Promise(resolve => {
    let settled = false;
    let cancel: (() => void) | undefined;
    const finish = (result?: LeaderboardProvinceResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      finish();
      try { cancel?.(); } catch { /* timeout already settled */ }
    }, Math.max(1, Math.min(10_000, Number.isFinite(timeoutMs) ? timeoutMs : LEADERBOARD_IP_LOOKUP_TIMEOUT_MS)));
    try {
      cancel = request(endpoint, (status, body) => {
        try { finish(status === 200 ? provinceFromIpResponse(body) : undefined); }
        catch { finish(); }
      });
    } catch { finish(); }
  });
}

export function requestWebProvince(fetcher: typeof fetch = fetch, endpoint = LEADERBOARD_IP_LOOKUP_URL): Promise<LeaderboardProvinceResult | undefined> {
  return resolveLeaderboardProvince((url, complete) => {
    const controller = typeof AbortController === "function" ? new AbortController() : undefined;
    fetcher(url, { method: "GET", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", signal: controller?.signal })
      .then(async response => complete(response.status, response.status === 200 ? await response.json() : undefined))
      .catch(() => complete(0, undefined));
    return () => controller?.abort();
  }, endpoint);
}

export function requestWechatProvince(api: { request?: (options: {
  url: string; method: "GET"; timeout: number;
  success: (result: { statusCode: number; data: unknown }) => void;
  fail: () => void;
}) => { abort?: () => void } | undefined }, endpoint = LEADERBOARD_IP_LOOKUP_URL): Promise<LeaderboardProvinceResult | undefined> {
  return resolveLeaderboardProvince((url, complete) => {
    if (typeof api.request !== "function") { complete(0, undefined); return undefined; }
    const task = api.request({ url, method: "GET", timeout: LEADERBOARD_IP_LOOKUP_TIMEOUT_MS,
      success: result => complete(result.statusCode, result.data), fail: () => complete(0, undefined) });
    return () => task?.abort?.();
  }, endpoint);
}
