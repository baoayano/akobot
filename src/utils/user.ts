import { UserModel } from '../schemas/users.js';

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