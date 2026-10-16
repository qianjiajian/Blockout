/** Province-level regions supported by the local mainline ranking. */
export const LEADERBOARD_PROVINCES = [
  { code: "11", name: "北京", english: "Beijing" },
  { code: "12", name: "天津", english: "Tianjin" },
  { code: "13", name: "河北", english: "Hebei" },
  { code: "14", name: "山西", english: "Shanxi" },
  { code: "15", name: "内蒙古", english: "Inner Mongolia" },
  { code: "21", name: "辽宁", english: "Liaoning" },
  { code: "22", name: "吉林", english: "Jilin" },
  { code: "23", name: "黑龙江", english: "Heilongjiang" },
  { code: "31", name: "上海", english: "Shanghai" },
  { code: "32", name: "江苏", english: "Jiangsu" },
  { code: "33", name: "浙江", english: "Zhejiang" },
  { code: "34", name: "安徽", english: "Anhui" },
  { code: "35", name: "福建", english: "Fujian" },
  { code: "36", name: "江西", english: "Jiangxi" },
  { code: "37", name: "山东", english: "Shandong" },
  { code: "41", name: "河南", english: "Henan" },
  { code: "42", name: "湖北", english: "Hubei" },
  { code: "43", name: "湖南", english: "Hunan" },
  { code: "44", name: "广东", english: "Guangdong" },
  { code: "45", name: "广西", english: "Guangxi" },
  { code: "46", name: "海南", english: "Hainan" },
  { code: "50", name: "重庆", english: "Chongqing" },
  { code: "51", name: "四川", english: "Sichuan" },
  { code: "52", name: "贵州", english: "Guizhou" },
  { code: "53", name: "云南", english: "Yunnan" },
  { code: "54", name: "西藏", english: "Tibet" },
  { code: "61", name: "陕西", english: "Shaanxi" },
  { code: "62", name: "甘肃", english: "Gansu" },
  { code: "63", name: "青海", english: "Qinghai" },
  { code: "64", name: "宁夏", english: "Ningxia" },
  { code: "65", name: "新疆", english: "Xinjiang" },
  { code: "71", name: "台湾", english: "Taiwan" },
  { code: "81", name: "香港", english: "Hong Kong" },
  { code: "82", name: "澳门", english: "Macao" },
] as const;

export function isRankingProvince(value: unknown): value is (typeof LEADERBOARD_PROVINCES)[number]["code"] {
  return typeof value === "string" && LEADERBOARD_PROVINCES.some(region => region.code === value);
}

/** Accept only a supported province name/code; never infer from arbitrary text. */
export function normalizeLeaderboardProvince(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  if (isRankingProvince(value)) return value;
  if (/^\d{6}$/.test(value) && isRankingProvince(value.slice(0, 2))) return value.slice(0, 2);
  const name = value.replace(/(壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市)$/, "");
  const english = value.toLowerCase().replace(/ province$/, "");
  return LEADERBOARD_PROVINCES.find(region => region.name === name || region.english.toLowerCase() === english)?.code;
}

export function randomRankingProvince(random: () => number = Math.random): string {
  const value = random();
  const index = Number.isFinite(value) ? Math.floor(Math.max(0, Math.min(1 - Number.EPSILON, value)) * LEADERBOARD_PROVINCES.length) : 0;
  return LEADERBOARD_PROVINCES[index].code;
}

export function rankingProvinceName(code: unknown, language = "zh-CN"): string {
  const province = LEADERBOARD_PROVINCES.find(region => region.code === code);
  return province ? (language.startsWith("zh") ? province.name : province.english) : "";
}
