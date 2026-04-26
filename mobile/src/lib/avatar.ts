const ADMIN_SEED = 'admin-prime';
const USER_SEEDS = ['user-alpha', 'user-beta', 'user-gamma', 'user-delta'];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getAvatarUrl(
  user: { email: string; role: string },
  size = 80,
): string {
  const seed =
    user.role === 'admin'
      ? ADMIN_SEED
      : USER_SEEDS[hashCode(user.email) % USER_SEEDS.length];
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(seed)}&size=${size}`;
}

export function getAvatarUrlByEmail(email: string, size = 56): string {
  const seed = USER_SEEDS[hashCode(email) % USER_SEEDS.length];
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(seed)}&size=${size}`;
}
