/**
 * IP Matching & Validation utility for API Key Whitelisting
 */

export function normalizeIp(ip) {
  if (!ip) return "";
  let clean = String(ip).trim();

  // Strip IPv6-mapped IPv4 prefix (e.g. ::ffff:127.0.0.1 -> 127.0.0.1)
  if (clean.startsWith("::ffff:")) {
    clean = clean.substring(7);
  }

  // Normalize IPv6 localhost
  if (clean === "::1") {
    return "127.0.0.1";
  }

  return clean;
}

function ipToInt(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  return parts.reduce((acc, octet) => {
    const num = parseInt(octet, 10);
    if (isNaN(num) || num < 0 || num > 255) return null;
    return (acc << 8) + num;
  }, 0) >>> 0;
}

function checkCidr(clientIp, cidr) {
  const [range, bitsStr = "32"] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);
  if (isNaN(bits) || bits < 0 || bits > 32) return false;

  const clientInt = ipToInt(clientIp);
  const rangeInt = ipToInt(range);
  if (clientInt === null || rangeInt === null) return false;

  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (clientInt & mask) === (rangeInt & mask);
}

/**
 * Checks if a client IP is allowed by the whitelist string.
 * @param {string} clientIp - The detected IP of the client
 * @param {string|null|undefined} allowedIpsStr - Comma-separated list of allowed IPs/CIDRs
 * @returns {boolean}
 */
export function isIpAllowed(clientIp, allowedIpsStr) {
  if (!allowedIpsStr || typeof allowedIpsStr !== "string") return true;

  const allowedList = allowedIpsStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Empty whitelist or wildcard "*" allows all traffic
  if (allowedList.length === 0 || allowedList.includes("*")) {
    return true;
  }

  const client = normalizeIp(clientIp);
  if (!client) return false;

  for (const item of allowedList) {
    const target = normalizeIp(item);
    if (!target) continue;

    // Exact match
    if (client === target) return true;

    // Wildcard prefix match (e.g. "192.168.1.*" or "10.0.*")
    if (target.endsWith("*")) {
      const prefix = target.slice(0, -1);
      if (client.startsWith(prefix)) return true;
    }

    // CIDR range match (e.g. "192.168.1.0/24")
    if (target.includes("/")) {
      if (checkCidr(client, target)) return true;
    }
  }

  return false;
}

/**
 * Extracts client IP from incoming HTTP request.
 * Prioritizes trusted peer headers stamped by custom-server.js, then reverse proxy headers.
 */
export function extractClientIp(request) {
  if (!request?.headers?.get) return "";
  const trustedHeader = request.headers.get("x-9r-peer-token");
  const token = process.env.NINEROUTER_PEER_TOKEN;
  if (Boolean(token) && trustedHeader === token) {
    const realIp = request.headers.get("x-9r-real-ip");
    if (realIp) return realIp.trim();
  }
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (request.headers.get("x-9r-real-ip") || "").trim();
}

