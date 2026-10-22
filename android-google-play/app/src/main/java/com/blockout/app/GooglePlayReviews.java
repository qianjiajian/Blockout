package com.blockout.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.widget.Toast;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BooleanSupplier;
import java.util.function.BiConsumer;

/** Official review UI only. No rating prediction, reward or submitted-rating flag. */
final class GooglePlayReviews {
    private final Activity activity;
    private final BooleanSupplier visible, acquire;
    private final Runnable release;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final SharedPreferences preferences;
    private ReviewManager manager;
    private ReviewInfo prepared;
    private long preparedAt, lastStoreOpen;
    private boolean preparing, destroyed;
    private int generation;

    GooglePlayReviews(Activity activity, BooleanSupplier visible, BooleanSupplier acquire, Runnable release) {
        this.activity = activity; this.visible = visible; this.acquire = acquire; this.release = release;
        preferences = activity.getSharedPreferences("google-play-reviews", 0);
    }

    private boolean eligible() {
        return !destroyed && GooglePlayReviewPolicy.eligible(System.currentTimeMillis(), preferences.getLong("last-attempt", 0));
    }

    void prepare(BiConsumer<Boolean, String> reply) {
        if (!visible.getAsBoolean() || preparing || !eligible()) { reply.accept(false, "review-ineligible"); return; }
        preparing = true; prepared = null;
        int token = ++generation;
        main.postDelayed(() -> {
            if (!destroyed && preparing && generation == token) {
                preparing = false; generation++; reply.accept(false, "review-timeout");
            }
        }, 15_000);
        try {
            manager = ReviewManagerFactory.create(activity);
            manager.requestReviewFlow().addOnCompleteListener(task -> {
                if (destroyed || generation != token || !preparing) return;
                preparing = false;
                if (task.isSuccessful()) {
                    prepared = task.getResult(); preparedAt = SystemClock.elapsedRealtime();
                    reply.accept(true, "review-prepared");
                } else reply.accept(false, "review-unavailable");
            });
        } catch (RuntimeException error) { preparing = false; generation++; reply.accept(false, "review-unavailable"); }
    }

    void launch(BiConsumer<Boolean, String> reply) {
        ReviewInfo info = prepared; prepared = null;
        if (!visible.getAsBoolean() || !eligible() || info == null
                || SystemClock.elapsedRealtime() - preparedAt > 30_000 || !acquire.getAsBoolean()) {
            reply.accept(false, "review-ineligible"); return;
        }
        // An attempt is not evidence that the card was shown or a rating submitted.
        preferences.edit().putLong("last-attempt", System.currentTimeMillis()).apply();
        AtomicBoolean complete = new AtomicBoolean();
        main.postDelayed(() -> {
            if (!destroyed && complete.compareAndSet(false, true)) { release.run(); reply.accept(false, "review-timeout"); }
        }, 120_000);
        try {
            manager.launchReviewFlow(activity, info).addOnCompleteListener(task -> {
                if (!destroyed && complete.compareAndSet(false, true)) {
                    release.run(); reply.accept(true, "review-flow-finished");
                }
            });
        } catch (RuntimeException error) {
            if (complete.compareAndSet(false, true)) { release.run(); reply.accept(false, "review-unavailable"); }
        }
    }

    void openStore(BiConsumer<Boolean, String> reply) {
        long now = SystemClock.elapsedRealtime();
        if (destroyed || !visible.getAsBoolean() || (lastStoreOpen > 0 && now - lastStoreOpen < 1500)) {
            reply.accept(false, "store-busy"); return;
        }
        lastStoreOpen = now;
        String id = activity.getPackageName();
        try {
            activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + id))
                    .setPackage("com.android.vending"));
        } catch (ActivityNotFoundException | SecurityException unavailable) {
            try { activity.startActivity(new Intent(Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=" + id))); }
            catch (ActivityNotFoundException | SecurityException missingBrowser) {
                Toast.makeText(activity, "Unable to open Google Play. Please try again later.", Toast.LENGTH_LONG).show();
                reply.accept(false, "store-unavailable"); return;
            }
        }
        preferences.edit().putLong("last-attempt", System.currentTimeMillis()).apply();
        reply.accept(true, "store-opened");
    }

    void reset() { generation++; preparing = false; prepared = null; }
    void destroy() { destroyed = true; reset(); main.removeCallbacksAndMessages(null); }
}
