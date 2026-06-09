import { UserModel } from '../schemas/users.js';

export type LeaderboardType = 'level' | 'cash';

export type LeaderboardEntry = {
  id: string;
  cash: number;
  level: number;
  exp: number;
};

const LEADERBOARD_EXCLUDED_USER_IDS = ['295936488661843968'];

export async function getUserOrNull(userId: string) {
  try {
    return await UserModel.findOne({ id: userId });
  } catch {
    return null;
  }
}

export async function getOrCreateUser(userId: string) {
  let user = await getUserOrNull(userId);

  if (!user) {
    user = await UserModel.create({ id: userId });
  }

  return user;
}

export async function userExists(userId: string): Promise<boolean> {
  const user = await getUserOrNull(userId);
  return !!user;
}

export async function getLeaderboard(
  type: LeaderboardType,
  limit = 10
): Promise<LeaderboardEntry[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 25);
  const sort = type === 'cash'
    ? { cash: -1 as const, level: -1 as const, exp: -1 as const }
    : { level: -1 as const, exp: -1 as const, cash: -1 as const };

  return UserModel.find(
    { id: { $nin: LEADERBOARD_EXCLUDED_USER_IDS } },
    { _id: 0, id: 1, cash: 1, level: 1, exp: 1 }
  )
    .sort(sort)
    .limit(safeLimit)
    .lean<LeaderboardEntry[]>();
}

export async function getData(userId: string) {
    const user = await getUserOrNull(userId);
    if (!user) return null;
    return {
        cash: user.cash,
        ruby: user.ruby,
        level: user.level,
        rank: user.rank,
        exp: user.exp,
        lastDaily: user.lastDaily,
        pray_luck: user.pray_luck,
        fish_inventory: user.fish_inventory,
        fish_rod: user.fish_rod,
        user
    };
}

export async function updateUser(userId: string, data: Partial<{ cash: number; ruby: number; level: number; rank: string; exp: number; lastDaily: Date | null }>) {
    const user = await getUserOrNull(userId);
    if (!user) return null;
    if (data.cash !== undefined) user.cash = data.cash;
    if (data.ruby !== undefined) user.ruby = data.ruby;
    if (data.level !== undefined) user.level = data.level;
    if (data.rank !== undefined) user.rank = data.rank;
    if (data.exp !== undefined) user.exp = data.exp;
    if (data.lastDaily !== undefined) user.lastDaily = data.lastDaily;
    await user.save();
}
