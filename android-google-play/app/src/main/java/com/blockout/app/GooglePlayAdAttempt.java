package com.blockout.app;

/** Main-thread attempt generation, timeout and retry budget. No SDK/network dependency. */
final class GooglePlayAdAttempt {
    private final long timeoutMs;
    private final long retryDelayMs;
    private long deadline, nextAttemptAt;
    private int generation;
    private boolean pending;

    GooglePlayAdAttempt(long timeoutMs, long retryDelayMs) {
        this.timeoutMs = timeoutMs;
        this.retryDelayMs = retryDelayMs;
    }

    int begin(long now) {
        expire(generation, now);
        if (pending || now < nextAttemptAt) return 0;
        pending = true;
        deadline = now + timeoutMs;
        return ++generation;
    }

    boolean finish(int token, long now, boolean success) {
        if (!pending || token != generation || now >= deadline) return false;
        pending = false;
        nextAttemptAt = success ? now : now + retryDelayMs;
        return true;
    }

    boolean expire(int token, long now) {
        if (!pending || token != generation || now < deadline) return false;
        pending = false;
        nextAttemptAt = deadline + retryDelayMs;
        return true;
    }

    boolean pending() { return pending; }
    void deferRetry(long now) { nextAttemptAt = Math.max(nextAttemptAt, now + retryDelayMs); }
    void invalidate() { pending = false; nextAttemptAt = 0; generation++; }
}
