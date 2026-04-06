const cooldowns = new Map<number, number>();
const COOLDOWN_MS = (parseInt(process.env.COOLDOWN_SECONDS ?? '3', 10)) * 1000;

export function isRateLimited(userId: number): boolean {
  const now = Date.now();
  const last = cooldowns.get(userId);
  if (last && now - last < COOLDOWN_MS) return true;
  cooldowns.set(userId, now);
  return false;
}
