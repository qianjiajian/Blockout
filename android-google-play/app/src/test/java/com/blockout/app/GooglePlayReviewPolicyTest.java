package com.blockout.app;
import org.junit.Test;
import static org.junit.Assert.*;

public class GooglePlayReviewPolicyTest {
    @Test public void firstAttemptIsEligible() { assertTrue(GooglePlayReviewPolicy.eligible(100, 0)); }
    @Test public void cooldownSurvivesVersionChangesAndRestarts() {
        long last = 1_000_000;
        assertFalse(GooglePlayReviewPolicy.eligible(last + GooglePlayReviewPolicy.COOLDOWN_MS - 1, last));
        assertTrue(GooglePlayReviewPolicy.eligible(last + GooglePlayReviewPolicy.COOLDOWN_MS, last));
    }
    @Test public void clockRollbackDoesNotSpam() {
        assertFalse(GooglePlayReviewPolicy.eligible(10, 20));
        assertFalse(GooglePlayReviewPolicy.eligible(0, 0));
    }
}
