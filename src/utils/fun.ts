export function getWinRate(bet: number): number {
  bet = Math.max(1, bet);

  // tăng nhẹ tỉ lệ gốc
  let rate =
    0.992 - Math.pow(Math.log10(bet), 1.32) * 0.082;

  // min 5%, max 99.2%
  return Math.max(0.05, Math.min(0.992, rate));
}

export function coinflip(
  choice: string,
  bet: number,
  luckPoint: number = 0
) {
  choice = choice.toLowerCase();

  if (!["heads", "tails"].includes(choice)) {
    throw new Error(
      "Choice phải là 'heads' hoặc 'tails'"
    );
  }

  const winRate = getWinRate(bet);

  // =========================
  // PLOT ARMOR SYSTEM
  // =========================

  let jackpotChance =
    Math.pow(
      Math.log10(bet + 1),
      1.32
    ) * 0.0052;

  // bonus từ luck point
  // scale mềm để tránh quá OP
  const luckBonus =
    Math.log10(luckPoint + 1) * 0.012;

  jackpotChance += luckBonus;

  // max 15%
  jackpotChance = Math.min(
    0.15,
    jackpotChance
  );

  const jackpotWin =
    Math.random() < jackpotChance;

  const shouldWin =
    jackpotWin ||
    Math.random() < winRate;

  const result = shouldWin
    ? choice
    : choice === "heads"
      ? "tails"
      : "heads";

  return {
    choice,
    result,
    win: result === choice,
    winRate,
    jackpotWin,
    jackpotChance,
    luckPoint,
    luckBonus
  };
}