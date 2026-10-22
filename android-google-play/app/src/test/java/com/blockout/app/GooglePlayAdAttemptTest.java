package com.blockout.app;

import static org.junit.Assert.*;
import org.junit.Test;

public class GooglePlayAdAttemptTest {
    @Test public void failureCanRetryAfterBoundedCooldown() {
        GooglePlayAdAttempt attempt = new GooglePlayAdAttempt(20_000, 10_000);
        int first = attempt.begin(0);
        assertTrue(first > 0);
        assertEquals(0, attempt.begin(1));
        assertTrue(attempt.finish(first, 2_000, false));
        assertEquals(0, attempt.begin(11_999));
        assertTrue(attempt.begin(12_000) > first);
    }

    @Test public void silentSdkTimeoutCannotBlockEveryLaterClick() {
        GooglePlayAdAttempt attempt = new GooglePlayAdAttempt(20_000, 10_000);
        int first = attempt.begin(0);
        assertFalse(attempt.expire(first, 19_999));
        assertTrue(attempt.expire(first, 20_000));
        assertFalse(attempt.pending());
        assertEquals(0, attempt.begin(29_999));
        int second = attempt.begin(30_000);
        assertTrue(second > first);
        assertFalse(attempt.finish(first, 30_001, true));
        assertTrue(attempt.pending());
        assertTrue(attempt.finish(second, 30_002, true));
    }

    @Test public void destroyedActivityTimerIsNotNeededToRecoverStaticInitialization() {
        GooglePlayAdAttempt attempt = new GooglePlayAdAttempt(20_000, 10_000);
        int first = attempt.begin(0);
        assertTrue(attempt.begin(30_000) > first);
        assertFalse(attempt.finish(first, 30_001, true));
    }

    @Test public void consentGenerationInvalidatesEarlierLoads() {
        GooglePlayAdAttempt attempt = new GooglePlayAdAttempt(20_000, 10_000);
        int first = attempt.begin(0);
        attempt.invalidate();
        int second = attempt.begin(1);
        assertFalse(attempt.finish(first, 2, true));
        assertFalse(attempt.expire(first, 30_000));
        assertTrue(attempt.finish(second, 3, true));
        assertFalse(attempt.finish(second, 4, true));
    }

    @Test public void timedOutSuccessDoesNotReviveInventory() {
        GooglePlayAdAttempt attempt = new GooglePlayAdAttempt(20_000, 10_000);
        int token = attempt.begin(0);
        assertFalse(attempt.finish(token, 20_000, true));
        assertEquals(0, attempt.begin(20_001));
    }
}
