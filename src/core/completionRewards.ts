/** Account-level policy; frozen level.reward values are historical map metadata. */
export const FIRST_CLEAR_COIN_REWARD = 40;

export const getCompletionCoinReward = (firstClear: boolean): number => (
  firstClear ? FIRST_CLEAR_COIN_REWARD : 0
);
