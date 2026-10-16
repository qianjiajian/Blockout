import { afterEach, describe, expect, it, vi } from "vitest";
import { LEADERBOARD_PROVINCES, normalizeLeaderboardProvince, randomRankingProvince, rankingProvinceName } from "../src/core/rankingProvince";
import { provinceFromIpResponse, resolveLeaderboardProvince, requestWechatProvince, requestWebProvince } from "../src/platform/leaderboardRegion";

afterEach(() => vi.useRealTimers());

describe("mainline province lookup", () => {
  it("normalizes all supported provincial names/codes without arbitrary prefix matches", () => {
    expect(LEADERBOARD_PROVINCES).toHaveLength(34);
    expect(new Set(LEADERBOARD_PROVINCES.map(p => p.code)).size).toBe(34);
    for (const p of LEADERBOARD_PROVINCES) {
      expect(normalizeLeaderboardProvince(p.name)).toBe(p.code);
      expect(normalizeLeaderboardProvince(p.code + "0000")).toBe(p.code);
      expect(normalizeLeaderboardProvince(p.english)).toBe(p.code);
    }
    expect(normalizeLeaderboardProvince("广东省")).toBe("44");
    expect(normalizeLeaderboardProvince("新疆维吾尔自治区")).toBe("65");
    expect(normalizeLeaderboardProvince("香港特别行政区")).toBe("81");
    for (const value of [null, {}, "广东省广州市", "Ontario", "119999999", "ShanghaiX", 440000]) {
      expect(normalizeLeaderboardProvince(value)).toBeUndefined();
    }
  });

  it("random fallback always yields a supported province and names fit their locale", () => {
    const picked = Array.from({ length: 34 }, (_, i) => randomRankingProvince(() => (i + .5) / 34));
    expect(new Set(picked).size).toBe(34);
    for (const n of [-1, 0, 1, 2, NaN, Infinity]) expect(LEADERBOARD_PROVINCES.some(p => p.code === randomRankingProvince(() => n))).toBe(true);
    expect(rankingProvinceName("44")).toBe("广东");
    expect(rankingProvinceName("44", "en")).toBe("Guangdong");
    expect(rankingProvinceName("invalid")).toBe("");
  });

  it("extracts only province and ip source from project/Tencent responses", () => {
    expect(provinceFromIpResponse({ province: "江苏省", ip: "not-persisted" })).toEqual({ province: "32", source: "ip" });
    expect(provinceFromIpResponse({ status: 0, result: { ip: "not-persisted", location: { lat: 22, lng: 113 },
      ad_info: { nation: "中国", nation_code: 156, province: "广东省", city: "广州市", adcode: 440100 } } }))
      .toEqual({ province: "44", source: "ip" });
    expect(provinceFromIpResponse({ status: 0, result: { ad_info: { adcode: 440100 } } }))
      .toEqual({ province: "44", source: "ip" });
    expect(provinceFromIpResponse({ status: 0, result: { ad_info: { adcode: "440100" } } }))
      .toEqual({ province: "44", source: "ip" });
  });

  it("rejects API errors, foreign results and unrecognized data", () => {
    for (const value of [null, [], "广东省", { province: "" }, { status: 120, province: "广东" },
      { province: "广东", nation: "United States" }, { province: "广东", nation_code: 840 }]) {
      expect(provinceFromIpResponse(value)).toBeUndefined();
    }
  });

  it("makes no request until a valid HTTPS service is configured", async () => {
    const transport = vi.fn();
    for (const endpoint of ["", "http://example.test", "https://name:password@example.test", "https://example.test/#bad", "relative/path"])
      expect(await resolveLeaderboardProvince(transport, endpoint)).toBeUndefined();
    expect(transport).not.toHaveBeenCalled();
    const native = vi.fn();
    expect(await requestWechatProvince({ request: native })).toBeUndefined();
    expect(native).not.toHaveBeenCalled();
    const fetcher = vi.fn();
    expect(await requestWebProvince(fetcher)).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("accepts configured success once and ignores a duplicate native callback", async () => {
    let complete!: (status: number, body: unknown) => void;
    const promise = resolveLeaderboardProvince((_url, done) => { complete = done; return undefined; }, "https://example.test/region");
    complete(200, { province: "广东省" }); complete(200, { province: "北京" });
    expect(await promise).toEqual({ province: "44", source: "ip" });
  });

  it("times out a hanging request, aborts it and ignores late successful data", async () => {
    vi.useFakeTimers();
    let complete!: (status: number, body: unknown) => void;
    const abort = vi.fn();
    const promise = resolveLeaderboardProvince((_url, done) => { complete = done; return abort; }, "https://example.test/region", 2200);
    await vi.advanceTimersByTimeAsync(2200);
    expect(await promise).toBeUndefined(); expect(abort).toHaveBeenCalledOnce();
    complete(200, { province: "广东省" });
    expect(await promise).toBeUndefined(); expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans the timeout on immediate HTTP, transport or parse failure", async () => {
    vi.useFakeTimers();
    const malformed = Object.defineProperty({}, "status", { get() { throw Error("bad property"); } });
    for (const request of [() => { throw Error("no network"); },
      (_url: string, done: (status: number, body: unknown) => void) => { done(503, { province: "广东" }); return undefined; },
      (_url: string, done: (status: number, body: unknown) => void) => { done(200, malformed); return undefined; }]) {
      expect(await resolveLeaderboardProvince(request, "https://example.test/region")).toBeUndefined();
      expect(vi.getTimerCount()).toBe(0);
    }
  });

  it("the web adapter requests only the configured endpoint, with no credentials or identity", async () => {
    const fetcher = vi.fn().mockResolvedValue({ status: 200, json: async () => ({ province: "广东" }) });
    expect(await requestWebProvince(fetcher, "https://example.test/province")).toEqual({ province: "44", source: "ip" });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]).toEqual(["https://example.test/province", {
      method: "GET", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", signal: expect.any(AbortSignal),
    }]);
    fetcher.mockRejectedValueOnce(Error("network"));
    expect(await requestWebProvince(fetcher, "https://example.test/province")).toBeUndefined();
    fetcher.mockResolvedValueOnce({ status: 200, json: async () => { throw Error("not json"); } });
    expect(await requestWebProvince(fetcher, "https://example.test/province")).toBeUndefined();
  });

  it("the native adapter uses wx.request and aborts a hung native task", async () => {
    vi.useFakeTimers();
    const abort = vi.fn();
    const request = vi.fn().mockReturnValue({ abort });
    const promise = requestWechatProvince({ request }, "https://example.test/province");
    const options = request.mock.calls[0][0];
    expect(Object.keys(options).sort()).toEqual(["fail", "method", "success", "timeout", "url"]);
    expect(options).toMatchObject({ method: "GET", url: "https://example.test/province", timeout: 2200 });
    await vi.advanceTimersByTimeAsync(2200);
    expect(await promise).toBeUndefined(); expect(abort).toHaveBeenCalledOnce();
    options.success({ statusCode: 200, data: { province: "北京" } });
    expect(await promise).toBeUndefined();
    const next = requestWechatProvince({ request }, "https://example.test/province");
    request.mock.calls[1][0].success({ statusCode: 200, data: { province: "上海" } });
    expect(await next).toEqual({ province: "31", source: "ip" });
    expect(vi.getTimerCount()).toBe(0);
  });
});
