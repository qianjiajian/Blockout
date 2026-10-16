/** HTTPS endpoint resolving the request's public IP to a province.
 * Use a project backend with its map-service key on the server. It may return
 * { province: "广东省" } or the Tencent IP API response (result.ad_info).
 * Keep empty until that service and its WeChat request domain are configured.
 * No GPS, account identifiers or client-stored IP address are required.
 * Empty/unavailable services use the saved random-region fallback in the game.
 */
export const LEADERBOARD_IP_LOOKUP_URL: string = "";
export const LEADERBOARD_IP_LOOKUP_TIMEOUT_MS = 2200;
