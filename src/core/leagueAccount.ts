import { advanceLeague, claimLeague, createLeague, finishLeagueAttempt, type LeagueAccount, type LeagueAttempt } from "./league";

export function reconcileLeagueAccount<T extends LeagueAccount>(account: T, eligible: boolean, now: number, seed: number): T & LeagueAccount {
  if (!eligible) return account;
  return { ...account, league: account.league ? advanceLeague(account.league, now) : createLeague(now, seed, 0) };
}
export type LeaguePersistence = "committed" | "rejected" | "unknown";
/** One outstanding candidate, retained on unknown. The adapter must persist coins and league atomically. */
export class LeagueAccountTransaction<T extends LeagueAccount> {
  private candidate?: T;
  private baseline?: T;
  constructor(private read: () => T, private write: (candidate: T, baseline: T) => LeaguePersistence, private accept: (candidate: T) => void) {}
  get pending(): boolean { return this.candidate !== undefined; }
  get pendingCandidate(): T | undefined { return this.candidate; }
  commit(build: (baseline: T) => T): LeaguePersistence {
    if (!this.candidate) {
      this.baseline = JSON.parse(JSON.stringify(this.read())) as T;
      this.candidate = build(this.baseline);
    }
    const outcome = this.write(this.candidate, this.baseline!);
    if (outcome === "committed") this.accept(this.candidate);
    if (outcome !== "unknown") { this.candidate = undefined; this.baseline = undefined; }
    return outcome;
  }
  claim(now: number): LeaguePersistence { return this.commit(account => claimLeague(account, now)); }
  finish(attempt: LeagueAttempt, success: boolean, now: number): LeaguePersistence {
    return this.commit(account => {
      if (!account.league) throw Error("League locked");
      return { ...account, league: finishLeagueAttempt(account.league, attempt, success, now).state };
    });
  }
}
