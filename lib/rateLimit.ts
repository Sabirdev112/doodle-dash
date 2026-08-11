interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
  cooldownUntil: number;
}

const buckets = new Map<string, RateLimitEntry>();

function getBucket(key: string, maxTokens: number): RateLimitEntry {
  let entry = buckets.get(key);
  if (!entry) {
    entry = { tokens: maxTokens, lastRefill: Date.now(), cooldownUntil: 0 };
    buckets.set(key, entry);
  }
  return entry;
}

function refill(entry: RateLimitEntry, maxTokens: number, refillRate: number): void {
  const now = Date.now();
  const elapsed = now - entry.lastRefill;
  const tokensToAdd = (elapsed / 1000) * refillRate;
  entry.tokens = Math.min(maxTokens, entry.tokens + tokensToAdd);
  entry.lastRefill = now;
}

export function checkRateLimit(
  key: string,
  maxTokens: number,
  refillRate: number,
  cost = 1
): boolean {
  const entry = getBucket(key, maxTokens);
  if (Date.now() < entry.cooldownUntil) return false;
  refill(entry, maxTokens, refillRate);
  if (entry.tokens < cost) {
    entry.cooldownUntil = Date.now() + 2000;
    return false;
  }
  entry.tokens -= cost;
  return true;
}

export function checkIpRateLimit(ip: string, action: string, maxPerMinute: number): boolean {
  return checkRateLimit(`ip:${ip}:${action}`, maxPerMinute, maxPerMinute / 60, 1);
}

export function checkDrawRateLimit(playerId: string): boolean {
  return checkRateLimit(`draw:${playerId}`, 50, 50, 1);
}

export function checkGuessRateLimit(playerId: string): boolean {
  return checkRateLimit(`guess:${playerId}`, 5, 5, 1);
}

export function checkGuessCooldown(playerId: string): boolean {
  return checkRateLimit(`guess-cd:${playerId}`, 1, 1.25, 1);
}

export function checkResyncRateLimit(playerId: string): boolean {
  return checkRateLimit(`resync:${playerId}`, 12, 0.2, 1);
}

export function checkUndoRateLimit(playerId: string): boolean {
  return checkRateLimit(`undo:${playerId}`, 8, 4, 1);
}

export function checkActionIpRateLimit(ip: string): boolean {
  return checkIpRateLimit(ip, "action", 120);
}

export function checkStatusIpRateLimit(ip: string): boolean {
  return checkIpRateLimit(ip, "status", 30);
}

export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now - entry.lastRefill > 300_000) buckets.delete(key);
  }
}
