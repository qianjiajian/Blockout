package com.blockout.app;

import java.util.HashSet;
import java.util.Set;

/** Pure scheduling rules. Caller supplies a monotonic clock; background time is excluded. */
final class GooglePlayAdPolicy {
    static final long COOLDOWN_MS = 120_000L;
    private final Set<String> settledAttempts = new HashSet<>();
    private long remainingMs = COOLDOWN_MS;
    private long lastTick;
    private boolean foreground;
    private boolean busy;
    private boolean gameReady;
    private boolean startupAttempted;
    private final boolean secondColdStart;

    GooglePlayAdPolicy(boolean secondColdStart, long now) {
        this.secondColdStart = secondColdStart;
        lastTick = now;
    }

    private void tick(long now) {
        if (foreground && !busy) remainingMs = Math.max(0L, remainingMs - Math.max(0L, now - lastTick));
        lastTick = now;
    }

    void setForeground(boolean visible, long now) { tick(now); foreground = visible; }
    long remaining(long now) { tick(now); return remainingMs; }
    boolean busy() { return busy; }
    boolean visible() { return foreground && !busy; }
    void gameReady() { gameReady = true; }
    boolean startupEligible() { return secondColdStart && !gameReady && !startupAttempted; }

    boolean beginStartup(boolean loaded, boolean consent, long now) {
        tick(now);
        if (!startupEligible() || !foreground || busy || !loaded || !consent) return false;
        startupAttempted = true;
        busy = true;
        return true;
    }

    boolean beginReward(boolean loaded, boolean consent, long now) {
        tick(now);
        if (!foreground || busy || !loaded || !consent) return false;
        busy = true; // Deliberately ignores remaining cooldown for an explicit user request.
        return true;
    }

    boolean beginSettlement(String attemptId, int levelId, boolean loaded, boolean consent, long now) {
        tick(now);
        // Consume a settlement even when an ad cannot show; no late surprise ad.
        if (settledAttempts.size() >= 4096 || !settledAttempts.add(attemptId)) return false;
        if (levelId < 6 || !foreground || busy || remainingMs > 0 || !loaded || !consent) return false;
        busy = true;
        return true;
    }

    boolean beginPrivacy(long now) {
        tick(now);
        if (!foreground || busy) return false;
        busy = true;
        return true;
    }

    void finish(boolean completeNonSplash, long now) {
        tick(now);
        if (completeNonSplash) remainingMs = COOLDOWN_MS;
        busy = false;
    }

    /** At most one reward, only after earned AND dismissed AND an actual show callback. */
    static final class RewardCompletion {
        private boolean shown, earned, closed, terminal;
        void shown() { if (!terminal) shown = true; }
        void earned() { if (!terminal) earned = true; }
        void closed() { if (!terminal) closed = true; }
        boolean takeReward() {
            if (terminal || !shown || !earned || !closed) return false;
            terminal = true;
            return true;
        }
        void cancel() { terminal = true; }
    }
}
