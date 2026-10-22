package com.blockout.app;

final class GooglePlayReviewPolicy {
    static final long COOLDOWN_MS = 90L * 24 * 60 * 60 * 1000;
    static boolean eligible(long now, long lastAttempt) {
        return now > 0 && (lastAttempt == 0 || (now >= lastAttempt && now - lastAttempt >= COOLDOWN_MS));
    }
}
