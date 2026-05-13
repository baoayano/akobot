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

export function getRandomFish(
    fishes: {
        name: string;
        rarity: string;
        probability: number;
        price: number;
    }[],
    luckPoint = 0,
    rod?: string
) {
    // separate rod buffs from player luck contribution
    // rod buffs remain the same and are applied additively
    const rodName = rod?.toLowerCase() || '';
    let rodBuff = 0;

    if (rodName.includes('golden')) {
        rodBuff += 25;
    }

    if (rodName.includes('mythic')) {
        rodBuff += 75;
    }

    if (rodName.includes('omega')) {
        rodBuff += 150;
    }

    // scale down the player's luck contribution to avoid overpowering rarities
    // use a soft log scale so very large luckPoint yields diminishing returns
    const luckContribution = Math.log10(luckPoint + 1) * 0.6; // tuned down

    const totalLuck = rodBuff + luckContribution;

    // mất dạy mode
    // càng nhiều luck càng dễ ra đồ hiếm
    // nhưng vẫn có khả năng dính rác :)

    const modifiedFishes = fishes.map(fish => {
        let multiplier = 1;

        switch (fish.rarity) {
            case 'Junk':
                // giảm mạnh rác
                multiplier = Math.max(
                    0.1,
                    1 - totalLuck * 0.0035
                );
                break;

            case 'Common':
                // nerf common
                multiplier = Math.max(
                    0.2,
                    1 - totalLuck * 0.0018
                );
                break;

            case 'Uncommon':
                multiplier =
                    1 + totalLuck * 0.003;
                break;

            case 'Rare':
                multiplier =
                    1 + totalLuck * 0.008;
                break;

            case 'Epic':
                multiplier =
                    1 + totalLuck * 0.016;
                break;

            case 'Legendary':
                multiplier =
                    1 + totalLuck * 0.035;
                break;

            case 'Mythic':
                multiplier =
                    1 + totalLuck * 0.07;
                break;

            case 'Treasure':
                multiplier =
                    1 + totalLuck * 0.02;
                break;
        }

        return {
            ...fish,
            adjustedProbability:
                fish.probability * multiplier
        };
    });

    // tổng probability mới
    const totalProbability =
        modifiedFishes.reduce(
            (sum, fish) =>
                sum + fish.adjustedProbability,
            0
        );

    // roll
    let random =
        Math.random() * totalProbability;

    // chọn fish
    for (const fish of modifiedFishes) {
        random -= fish.adjustedProbability;

        if (random <= 0) {
            return {
                ...fish,

                // debug info
                totalLuck,
                rod: rod || null,
            };
        }
    }

    // fallback
    return {
        ...modifiedFishes[0],
        totalLuck,
        rod: rod || null,
    };
}