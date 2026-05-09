export function getMaxLevelExp(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.5));
}

export function getLevelUpCoins(level: number): number {
  return Math.floor(3200 * Math.pow(level, 1.2));
}

export function getSendLimit(level: number): number {
    return level < 30 ? Math.floor(500 * Math.pow(level, 2.4)) : 10000000;
}

export function getReceiveLimit(level: number): number {
    return level < 30 ? Math.floor(10000 * Math.pow(level, 1.7)) : 50000000;
}