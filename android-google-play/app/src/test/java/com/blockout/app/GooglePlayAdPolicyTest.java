package com.blockout.app;

import org.junit.Test;
import static org.junit.Assert.*;

public final class GooglePlayAdPolicyTest {
    private GooglePlayAdPolicy foreground(boolean second) {
        GooglePlayAdPolicy p = new GooglePlayAdPolicy(second, 0);
        p.setForeground(true, 0);
        return p;
    }

    private GooglePlayAdPolicy cooldownExpired() {
        GooglePlayAdPolicy p = new GooglePlayAdPolicy(false, -120000);
        p.setForeground(true, -120000);
        assertEquals(0, p.remaining(0));
        return p;
    }

    @Test public void firstColdLaunchNeverShowsSplash() {
        assertFalse(foreground(false).beginStartup(true, true, 100));
    }
    @Test public void secondColdLaunchShowsOnlyBeforeGameReadyAndOnlyOnce() {
        GooglePlayAdPolicy p = foreground(true);
        assertTrue(p.beginStartup(true, true, 0));
        p.finish(false, 100);
        assertFalse(p.beginStartup(true, true, 101));
        GooglePlayAdPolicy late = foreground(true);
        late.gameReady();
        assertFalse(late.beginStartup(true, true, 0));
    }
    @Test public void missingAdOrConsentNeverBlocksStartup() {
        GooglePlayAdPolicy p = foreground(true);
        assertFalse(p.beginStartup(false, true, 0));
        assertFalse(p.beginStartup(true, false, 1));
        assertFalse(p.busy());
        p.gameReady();
        assertFalse(p.beginStartup(true, true, 2));
    }
    @Test public void firstFiveLevelsNeverShowInterstitial() {
        GooglePlayAdPolicy p = cooldownExpired();
        for (int level = 1; level <= 5; level++) assertFalse(p.beginSettlement("a" + level, level, true, true, 0));
        assertTrue(p.beginSettlement("a6", 6, true, true, 0));
    }
    @Test public void settlementIsConsumedEvenWhenAdUnavailable() {
        GooglePlayAdPolicy p = cooldownExpired();
        assertFalse(p.beginSettlement("a6", 6, false, true, 0));
        assertFalse(p.beginSettlement("a6", 6, true, true, 1));
        assertTrue(p.beginSettlement("retry6", 6, true, true, 1));
    }
    @Test public void cooldownCountsOnlyForegroundAndStartsAtCompletedClose() {
        GooglePlayAdPolicy p = cooldownExpired();
        assertTrue(p.beginSettlement("a6", 6, true, true, 0));
        p.finish(true, 1000);
        assertEquals(120000, p.remaining(1000));
        p.setForeground(false, 61000);
        assertEquals(60000, p.remaining(1000000));
        p.setForeground(true, 1000000);
        assertFalse(p.beginSettlement("a7", 7, true, true, 1059999));
        assertTrue(p.beginSettlement("a8", 8, true, true, 1060000));
    }
    @Test public void explicitRewardIgnoresCooldownButResetsItOnlyOnCompletion() {
        GooglePlayAdPolicy p = foreground(false);
        assertTrue(p.beginReward(true, true, 0));
        p.finish(true, 1000);
        assertTrue(p.beginReward(true, true, 2000));
        p.finish(false, 5000);
        assertEquals(119000, p.remaining(5000));
        assertTrue(p.beginReward(true, true, 6000));
        p.finish(true, 9000);
        assertEquals(120000, p.remaining(9000));
    }
    @Test public void foregroundConsentAndSingleInFlightApplyToEveryFormat() {
        GooglePlayAdPolicy p = foreground(true);
        assertFalse(p.beginReward(true, false, 0));
        assertTrue(p.beginReward(true, true, 0));
        assertFalse(p.beginStartup(true, true, 0));
        assertFalse(p.beginSettlement("a6", 6, true, true, 0));
        assertFalse(p.beginReward(true, true, 0));
        p.finish(false, 1);
        p.setForeground(false, 1);
        assertFalse(p.beginReward(true, true, 2));
    }
    @Test public void rewardNeedsShowEarnAndCloseExactlyOnce() {
        GooglePlayAdPolicy.RewardCompletion r = new GooglePlayAdPolicy.RewardCompletion();
        r.shown(); r.earned();
        assertFalse(r.takeReward());
        r.closed();
        assertTrue(r.takeReward());
        assertFalse(r.takeReward());
    }
    @Test public void dismissalBeforeEarnCanCompleteButFailureNeverRewards() {
        GooglePlayAdPolicy.RewardCompletion r = new GooglePlayAdPolicy.RewardCompletion();
        r.shown(); r.closed();
        assertFalse(r.takeReward());
        r.earned();
        assertTrue(r.takeReward());
        GooglePlayAdPolicy.RewardCompletion failed = new GooglePlayAdPolicy.RewardCompletion();
        failed.cancel(); failed.shown(); failed.earned(); failed.closed();
        assertFalse(failed.takeReward());
    }
    @Test public void cancelWithoutRewardNeverGrantsOrResetsCooldown() {
        GooglePlayAdPolicy.RewardCompletion r = new GooglePlayAdPolicy.RewardCompletion();
        r.shown(); r.closed();
        assertFalse(r.takeReward());
        r.cancel(); r.earned();
        assertFalse(r.takeReward());
        GooglePlayAdPolicy p = foreground(false);
        assertTrue(p.beginReward(true, true, 0));
        p.finish(false, 10);
        assertEquals(120000, p.remaining(10));
    }
    @Test public void splashDoesNotResetSharedCooldown() {
        GooglePlayAdPolicy p = foreground(true);
        assertTrue(p.beginStartup(true, true, 0));
        p.finish(false, 10000);
        assertEquals(120000, p.remaining(10000));
        assertFalse(p.beginSettlement("a6", 6, true, true, 10001));
        assertTrue(p.beginSettlement("a7", 7, true, true, 130000));
    }
    @Test public void initialCooldownBlocksFirst120SecondsOfForegroundPlay() {
        GooglePlayAdPolicy p = foreground(false);
        assertEquals(120000, p.remaining(0));
        assertFalse(p.beginSettlement("a6", 6, true, true, 119999));
        assertTrue(p.beginSettlement("a7", 7, true, true, 120000));
    }
}
