package com.blockout.app;

import android.app.Activity;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.google.android.libraries.ads.mobile.sdk.MobileAds;
import com.google.android.libraries.ads.mobile.sdk.appopen.AppOpenAd;
import com.google.android.libraries.ads.mobile.sdk.appopen.AppOpenAdEventCallback;
import com.google.android.libraries.ads.mobile.sdk.common.AdLoadCallback;
import com.google.android.libraries.ads.mobile.sdk.common.AdRequest;
import com.google.android.libraries.ads.mobile.sdk.common.FullScreenContentError;
import com.google.android.libraries.ads.mobile.sdk.common.LoadAdError;
import com.google.android.libraries.ads.mobile.sdk.initialization.InitializationConfig;
import com.google.android.libraries.ads.mobile.sdk.interstitial.InterstitialAd;
import com.google.android.libraries.ads.mobile.sdk.interstitial.InterstitialAdEventCallback;
import com.google.android.libraries.ads.mobile.sdk.rewarded.RewardedAd;
import com.google.android.libraries.ads.mobile.sdk.rewarded.RewardedAdEventCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONException;
import org.json.JSONObject;

/** Dedicated Google Play integration. Never register an unscoped JavascriptInterface.
 * The unmodified vendor AAR is packaged for review but its consent-bypassing
 * SDKUtils initializer, Application, splash launcher and telemetry remain inactive. */
final class GooglePlaySdkBridge {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String TAG = "SlideJamAds";
    private static final long LOAD_TIMEOUT_MS = 20_000;
    private static final long INIT_TIMEOUT_MS = 30_000;
    private static final GooglePlayAdAttempt INITIALIZATION = new GooglePlayAdAttempt(INIT_TIMEOUT_MS, 10_000);
    private static String initializationError = "";
    private static volatile boolean initialized;
    private static boolean countedThisProcess;
    private static boolean coldStartClaimed;
    private final Activity activity;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ConsentInformation consent;
    private final GooglePlayAdPolicy policy;
    private final GooglePlayReviews reviews;
    private final Set<String> usedRequestIds = new HashSet<>();
    private WebView webView;
    private JavaScriptReplyProxy events;
    private boolean destroyed, resumed, consentFinished, startupRequested;
    private boolean initialFormPending, recoveryWhenFocused;
    private volatile boolean adsAllowed;
    private final GooglePlayAdAttempt consentAttempt = new GooglePlayAdAttempt(LOAD_TIMEOUT_MS, 10_000);
    private final GooglePlayAdAttempt rewardAttempt = new GooglePlayAdAttempt(LOAD_TIMEOUT_MS, 10_000);
    private final GooglePlayAdAttempt interAttempt = new GooglePlayAdAttempt(LOAD_TIMEOUT_MS, 10_000);
    private final GooglePlayAdAttempt splashAttempt = new GooglePlayAdAttempt(LOAD_TIMEOUT_MS, 10_000);
    private String consentStatus = "not-requested", consentError = "", rewardError = "", lastAdError = "";
    private Toast adToast;
    private long rewardLoadedAt, interLoadedAt, splashLoadedAt;
    private RewardedAd reward;
    private InterstitialAd inter;
    private AppOpenAd splash;
    private int consentGeneration;

    GooglePlaySdkBridge(Activity activity) {
        this.activity = activity;
        consent = UserMessagingPlatform.getConsentInformation(activity);
        boolean secondColdStart = false;
        synchronized (GooglePlaySdkBridge.class) {
            if (!countedThisProcess) {
                countedThisProcess = true;
                SharedPreferences prefs = activity.getSharedPreferences("google-play-sdk", 0);
                int launches = prefs.getInt("cold-launches", 0);
                secondColdStart = launches >= 1;
                prefs.edit().putInt("cold-launches", Math.min(1_000_000, launches + 1)).apply();
            }
            if (coldStartClaimed) secondColdStart = false;
            coldStartClaimed = true;
        }
        policy = new GooglePlayAdPolicy(secondColdStart, now());
        reviews = new GooglePlayReviews(activity,
                () -> !destroyed && policy.visible() && activity.hasWindowFocus(),
                () -> { boolean acquired = policy.beginPrivacy(now()); if (acquired) broadcast(); return acquired; },
                this::recoverMissingCallback);
    }

    void attach(WebView view) {
        detach();
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            Log.w(TAG, "bridge unsupported: update Android System WebView");
            return;
        }
        webView = view;
        WebViewCompat.addWebMessageListener(view, "SlideJamNative", Collections.singleton(ORIGIN),
                (sender, message, sourceOrigin, isMainFrame, proxy) -> {
                    if (destroyed || sender != webView || !isMainFrame || !trustedOrigin(sourceOrigin)
                            || !trustedDocument(sender.getUrl()) || message.getType() != WebMessageCompat.TYPE_STRING) return;
                    String raw = message.getData();
                    if (raw == null || raw.length() > 4096) return;
                    events = proxy;
                    receive(sender, proxy, raw);
                });
    }

    void detach() {
        reviews.reset();
        WebView old = webView;
        webView = null;
        events = null;
        if (old != null && WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.removeWebMessageListener(old, "SlideJamNative");
        }
    }

    private static boolean trustedOrigin(Uri uri) {
        return "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())
                && uri.getPort() == -1 && uri.getUserInfo() == null;
    }

    private static boolean trustedDocument(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        return trustedOrigin(uri) && "/index.html".equals(uri.getPath()) && uri.getQuery() == null;
    }

    private void receive(WebView sender, JavaScriptReplyProxy proxy, String raw) {
        String id = "";
        try {
            JSONObject request = new JSONObject(raw);
            Object rawId = request.opt("id"), rawType = request.opt("type");
            if (!(rawId instanceof String) || !(rawType instanceof String)) return;
            id = (String) rawId;
            if (!id.matches("[A-Za-z0-9_.:-]{1,160}")) return;
            String type = (String) rawType;
            JSONObject payload = request.optJSONObject("payload");
            if (payload == null) payload = new JSONObject();
            Reply reply = new Reply(sender, proxy, id);
            if (!"status".equals(type) && (usedRequestIds.size() >= 4096 || !usedRequestIds.add(id))) {
                reply.send(false, "duplicate-or-limit", false); return;
            }
            switch (type) {
                case "status": reply.send(true, "ready", false); broadcast(); break;
                case "startup":
                    startupRequested = true;
                    trySplash();
                    reply.send(true, policy.busy() ? "showing" : "skipped", false);
                    break;
                case "gameReady": policy.gameReady(); splash = null; reply.send(true, "ready", false); break;
                case "rewarded":
                    if (!"game-reward".equals(payload.optString("placement"))) {
                        reply.send(false, "invalid-placement", false); break;
                    }
                    showReward(reply);
                    break;
                case "settlement": {
                    int level = validLevel(payload);
                    String attempt = validAttempt(payload);
                    if (level < 1 || attempt == null) { reply.send(false, "invalid-payload", false); break; }
                    showInterstitial(reply, attempt, level);
                    break;
                }
                case "reviewPrepare": reviews.prepare((ok, status) -> reply.send(ok, status, false)); break;
                case "reviewLaunch": reviews.launch((ok, status) -> reply.send(ok, status, false)); break;
                case "reviewStore": reviews.openStore((ok, status) -> reply.send(ok, status, false)); break;
                case "privacyOptions": showPrivacy(reply); break;
                case "levelStart":
                case "levelEnd":
                    boolean valid = validLevel(payload) > 0 && validAttempt(payload) != null;
                    if ("levelEnd".equals(type)) {
                        double duration = payload.optDouble("duration", Double.NaN);
                        valid &= ("success".equals(payload.optString("result")) || "fail".equals(payload.optString("result")))
                                && Double.isFinite(duration) && duration >= 0 && duration <= 86400;
                    }
                    // Neither SDKUtils nor SolarEngine is initialized. Do not fabricate backend events.
                    reply.send(valid, valid ? "analytics-disabled" : "invalid-payload", false);
                    break;
                default: reply.send(false, "unsupported", false);
            }
        } catch (JSONException | IllegalArgumentException ignored) {
            if (!id.isEmpty()) new Reply(sender, proxy, id).send(false, "invalid-request", false);
        } catch (RuntimeException error) {
            recordError("bridge", error.toString());
            if (!id.isEmpty()) new Reply(sender, proxy, id).send(false, "sdk-unavailable", false);
        }
    }

    private static int validLevel(JSONObject p) {
        Object level = p.opt("levelId");
        if (!(level instanceof Number)) return -1;
        double n = ((Number) level).doubleValue();
        return Double.isFinite(n) && n == Math.floor(n) && n >= 1 && n <= 10000 ? (int) n : -1;
    }
    private static String validAttempt(JSONObject p) {
        Object value = p.opt("attemptId");
        return value instanceof String && ((String) value).matches("[A-Za-z0-9_.:-]{1,160}") ? (String) value : null;
    }

    private final class Reply {
        private final WebView sender;
        private final JavaScriptReplyProxy proxy;
        private final String id;
        private boolean sent;
        Reply(WebView sender, JavaScriptReplyProxy proxy, String id) { this.sender = sender; this.proxy = proxy; this.id = id; }
        void send(boolean ok, String status, boolean rewarded) {
            if (sent) return;
            sent = true;
            JSONObject result = json("id", id, "type", "result", "ok", ok, "status", status,
                    "rewarded", rewarded, "state", state());
            post(sender, proxy, result);
        }
    }

    private static JSONObject json(Object... pairs) {
        JSONObject object = new JSONObject();
        try { for (int i = 0; i < pairs.length; i += 2) object.put((String) pairs[i], pairs[i + 1]); }
        catch (JSONException ignored) { /* Only fixed keys and finite local values are used. */ }
        return object;
    }

    private void post(WebView sender, JavaScriptReplyProxy proxy, JSONObject data) {
        if (destroyed || sender != webView || proxy == null || !trustedDocument(sender.getUrl())) return;
        try { proxy.postMessage(data.toString()); } catch (RuntimeException ignored) { /* Renderer may have exited. */ }
    }

    private JSONObject state() {
        return json("adsMode", "official-test", "consentReady", allowed(), "privacyOptionsRequired", privacyRequired(),
                "rewardedReady", reward != null && allowed(), "interstitialReady", inter != null && allowed(),
                "consentStatus", consentStatus, "adsStatus", initialized ? "ready" : INITIALIZATION.pending() ? "initializing" : initializationError.isEmpty() ? "not-started" : "failed",
                "rewardedStatus", reward != null && allowed() ? "ready" : rewardAttempt.pending() ? "loading" : rewardError.isEmpty() ? "not-loaded" : "failed",
                "lastAdError", lastAdError,
                "analyticsEnabled", false, "mediationAvailable", false, "mediationWrapperPackaged", true,
                "mediationWrapperIntegrated", false, "mediationStatus", "blocked-unsafe-initialization",
                "cooldownMs", policy.remaining(now()));
    }

    private void broadcast() {
        if (webView == null) return;
        post(webView, events, json("type", "state", "state", state()));
        post(webView, events, json("type", "visibility", "visible", policy.visible()));
    }

    void resume() {
        if (destroyed) return;
        resumed = true;
        policy.setForeground(true, now());
        recoverAds();
        focusChanged(activity.hasWindowFocus());
        broadcast();
    }

    void pause() {
        resumed = false;
        policy.setForeground(false, now());
        broadcast();
    }

    void focusChanged(boolean hasFocus) {
        if (hasFocus && resumed && recoveryWhenFocused) {
            recoveryWhenFocused = false;
            finished(false);
        }
    }

    private void recoverMissingCallback() {
        if (destroyed) return;
        // Do not resume gameplay behind an ad/consent dialog that is still covering it.
        if (resumed && activity.hasWindowFocus()) finished(false);
        else recoveryWhenFocused = true;
    }

    void destroy() {
        destroyed = true;
        reviews.destroy();
        adsAllowed = false;
        main.removeCallbacksAndMessages(null);
        consentAttempt.invalidate(); rewardAttempt.invalidate(); interAttempt.invalidate(); splashAttempt.invalidate();
        if (adToast != null) adToast.cancel();
        reward = null; inter = null; splash = null;
        detach();
    }

    private static long now() { return SystemClock.elapsedRealtime(); }
    private boolean alive() { return !destroyed && !activity.isFinishing() && !activity.isDestroyed(); }
    private boolean allowed() { return alive() && consentFinished && adsAllowed && consent.canRequestAds(); }
    private boolean privacyRequired() {
        return consent.getPrivacyOptionsRequirementStatus() == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
    }

    private void recordError(String stage, String detail) {
        String safe = detail == null ? "unknown" : detail.replace('\n', ' ').replace('\r', ' ');
        if (safe.length() > 280) safe = safe.substring(0, 280);
        lastAdError = stage + ": " + safe;
        Log.w(TAG, lastAdError);
    }

    private void recoverAds() {
        if (!alive() || !resumed || webView == null || policy.busy()) return;
        if (initialFormPending) showInitialConsentForm();
        else if (!allowed()) requestConsent();
        else initializeAds();
    }

    private void requestConsent() {
        if (!alive() || !resumed || policy.busy() || initialFormPending) return;
        final int token = consentAttempt.begin(now());
        if (token == 0) return;
        consentStatus = "checking";
        Log.i(TAG, "consent update started");
        main.postDelayed(() -> {
            if (!alive() || !consentAttempt.expire(token, now())) return;
            consentStatus = "failed"; consentError = "timeout";
            recordError("consent", consentError);
            // A timeout is not permission; cached UMP permission may still be valid.
            finishConsent();
        }, LOAD_TIMEOUT_MS);
        // Do not guess the audience's age or geographic region, and never treat a timeout as consent.
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().build();
        try { consent.requestConsentInfoUpdate(activity, params,
                () -> {
                    if (!alive() || !consentAttempt.finish(token, now(), true)) return;
                    consentError = "";
                    initialFormPending = true;
                    consentStatus = "form";
                    showInitialConsentForm();
                }, error -> {
                    if (!alive() || !consentAttempt.finish(token, now(), false)) return;
                    consentError = "UMP " + error.getErrorCode() + ": " + error.getMessage();
                    recordError("consent", consentError); finishConsent();
                }); }
        catch (RuntimeException error) {
            if (consentAttempt.finish(token, now(), false)) {
                consentError = error.toString(); recordError("consent", consentError); finishConsent();
            }
        }
    }

    private void showInitialConsentForm() {
        if (!alive() || !resumed || !initialFormPending || !policy.beginPrivacy(now())) return;
        initialFormPending = false;
        AtomicBoolean complete = new AtomicBoolean();
        broadcast();
        main.postDelayed(() -> {
            if (complete.compareAndSet(false, true)) {
                adsAllowed = false; consentFinished = true; consentStatus = "failed"; consentError = "form-timeout";
                recordError("consent", consentError); recoverMissingCallback(); broadcast();
            }
        }, 290_000);
        try { UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, error -> {
            if (complete.compareAndSet(false, true)) {
                if (error != null) { consentError = "UMP " + error.getErrorCode() + ": " + error.getMessage(); recordError("consent-form", consentError); }
                finished(false); finishConsent();
            }
        }); } catch (RuntimeException error) {
            if (complete.compareAndSet(false, true)) {
                consentError = error.toString(); recordError("consent-form", consentError);
                finished(false); finishConsent();
            }
        }
    }

    private void finishConsent() {
        if (!alive()) return;
        consentFinished = true;
        adsAllowed = consent.canRequestAds();
        consentStatus = adsAllowed ? "ready" : consentError.isEmpty() ? "not-authorized" : "failed";
        Log.i(TAG, "consent result=" + consentStatus);
        if (adsAllowed) initializeAds();
        else { consentAttempt.deferRetry(now()); reward = null; inter = null; splash = null; }
        broadcast();
    }

    private void initializeAds() {
        if (!allowed()) return;
        if (initialized) { preload(); return; }
        final int token = INITIALIZATION.begin(now());
        if (token == 0) return;
        Log.i(TAG, "SDK initialization started");
        main.postDelayed(() -> {
            if (!INITIALIZATION.expire(token, now())) return;
            initializationError = "timeout"; recordError("initialization", initializationError); broadcast();
        }, INIT_TIMEOUT_MS);
        new Thread(() -> {
            try {
                if (!adsAllowed || destroyed) { main.post(() -> INITIALIZATION.finish(token, now(), false)); return; }
                MobileAds.initialize(activity.getApplicationContext(),
                        new InitializationConfig.Builder(activity.getString(R.string.admob_app_id)).build(),
                        status -> main.post(() -> {
                            if (!INITIALIZATION.finish(token, now(), true)) return;
                            initialized = true; initializationError = "";
                            Log.i(TAG, "SDK initialization complete"); preload(); broadcast();
                        }));
            } catch (RuntimeException | LinkageError error) { main.post(() -> {
                if (!INITIALIZATION.finish(token, now(), false)) return;
                initializationError = error.toString(); recordError("initialization", initializationError); broadcast();
            }); }
        }, "google-play-ads-init").start();
    }

    private void preload() {
        if (!allowed() || !initialized || !resumed) return;
        long current = now();
        if (reward != null && current - rewardLoadedAt >= 55 * 60_000L) reward = null;
        if (inter != null && current - interLoadedAt >= 55 * 60_000L) inter = null;
        if (splash != null && current - splashLoadedAt >= 3 * 60 * 60_000L) splash = null;
        final int generation = consentGeneration;
        final int rewardToken = reward == null ? rewardAttempt.begin(current) : 0;
        if (rewardToken != 0) {
            Log.i(TAG, "reward load started (official-test unit)");
            main.postDelayed(() -> {
                if (!alive() || !rewardAttempt.expire(rewardToken, now())) return;
                rewardError = "timeout"; recordError("reward-load", rewardError); retryPreload(); broadcast();
            }, LOAD_TIMEOUT_MS);
            try { RewardedAd.load(new AdRequest.Builder(activity.getString(R.string.reward_unit_id)).build(), new AdLoadCallback<RewardedAd>() {
                public void onAdLoaded(RewardedAd ad) { main.post(() -> {
                    if (!alive() || !rewardAttempt.finish(rewardToken, now(), true)) return;
                    if (allowed() && generation == consentGeneration) {
                        reward = ad; rewardLoadedAt = now(); rewardError = ""; Log.i(TAG, "reward ready");
                    }
                    // Loading after a failed tap never schedules a later surprise ad.
                    broadcast();
                }); }
                public void onAdFailedToLoad(LoadAdError error) { main.post(() -> {
                    if (!alive() || !rewardAttempt.finish(rewardToken, now(), false)) return;
                    rewardError = error.getCode() + ": " + error.getMessage(); recordError("reward-load", rewardError); retryPreload(); broadcast();
                }); }
            }); } catch (RuntimeException | LinkageError error) {
                if (rewardAttempt.finish(rewardToken, now(), false)) {
                    rewardError = error.toString(); recordError("reward-load", rewardError); retryPreload(); broadcast();
                }
            }
        }
        final int interToken = inter == null ? interAttempt.begin(current) : 0;
        if (interToken != 0) {
            main.postDelayed(() -> {
                if (!alive() || !interAttempt.expire(interToken, now())) return;
                recordError("interstitial-load", "timeout"); retryPreload(); broadcast();
            }, LOAD_TIMEOUT_MS);
            try { InterstitialAd.load(new AdRequest.Builder(activity.getString(R.string.inter_unit_id)).build(), new AdLoadCallback<InterstitialAd>() {
                public void onAdLoaded(InterstitialAd ad) { main.post(() -> {
                    if (!alive() || !interAttempt.finish(interToken, now(), true)) return;
                    if (allowed() && generation == consentGeneration) { inter = ad; interLoadedAt = now(); }
                    broadcast();
                }); }
                public void onAdFailedToLoad(LoadAdError error) { main.post(() -> {
                    if (!alive() || !interAttempt.finish(interToken, now(), false)) return;
                    recordError("interstitial-load", error.getCode() + ": " + error.getMessage()); retryPreload(); broadcast();
                }); }
            }); } catch (RuntimeException | LinkageError error) {
                if (interAttempt.finish(interToken, now(), false)) { recordError("interstitial-load", error.toString()); retryPreload(); broadcast(); }
            }
        }
        final int splashToken = policy.startupEligible() && splash == null ? splashAttempt.begin(current) : 0;
        if (splashToken != 0) {
            main.postDelayed(() -> {
                if (!alive() || !splashAttempt.expire(splashToken, now())) return;
                recordError("app-open-load", "timeout"); broadcast();
            }, LOAD_TIMEOUT_MS);
            try { AppOpenAd.load(new AdRequest.Builder(activity.getString(R.string.splash_unit_id)).build(), new AdLoadCallback<AppOpenAd>() {
                public void onAdLoaded(AppOpenAd ad) { main.post(() -> {
                    if (!alive() || !splashAttempt.finish(splashToken, now(), true)) return;
                    if (allowed() && generation == consentGeneration && policy.startupEligible()) { splash = ad; splashLoadedAt = now(); trySplash(); }
                    broadcast();
                }); }
                public void onAdFailedToLoad(LoadAdError error) { main.post(() -> {
                    if (!alive() || !splashAttempt.finish(splashToken, now(), false)) return;
                    recordError("app-open-load", error.getCode() + ": " + error.getMessage()); broadcast();
                }); }
            }); } catch (RuntimeException | LinkageError error) {
                if (splashAttempt.finish(splashToken, now(), false)) { recordError("app-open-load", error.toString()); broadcast(); }
            }
        }
    }

    private final Runnable retry = this::preload;
    private void retryPreload() { if (!destroyed) { main.removeCallbacks(retry); main.postDelayed(retry, 30_000); } }

    private void finished(boolean completeNonSplash) {
        recoveryWhenFocused = false;
        policy.finish(completeNonSplash, now());
        broadcast();
        preload();
    }

    private void showReward(Reply reply) {
        Log.i(TAG, "reward requested: consent=" + consentStatus + " initialized=" + initialized + " loaded=" + (reward != null));
        recoverAds();
        if (!policy.beginReward(reward != null, allowed(), now())) {
            String status = !resumed || policy.busy() ? "busy"
                    : !allowed() ? consentAttempt.pending() || initialFormPending ? "consent-pending" : "consent-unavailable"
                    : !initialized ? INITIALIZATION.pending() ? "initializing" : "initialization-failed"
                    : rewardAttempt.pending() ? "loading" : "load-failed";
            showRewardFeedback(status);
            reply.send(false, status, false); broadcast(); return;
        }
        RewardedAd ad = reward; reward = null;
        GooglePlayAdPolicy.RewardCompletion outcome = new GooglePlayAdPolicy.RewardCompletion();
        AtomicBoolean complete = new AtomicBoolean();
        main.postDelayed(() -> {
            if (complete.compareAndSet(false, true)) { outcome.cancel(); recoverMissingCallback(); reply.send(false, "callback-timeout", false); }
        }, 290_000);
        Runnable grant = () -> {
            if (outcome.takeReward() && complete.compareAndSet(false, true)) {
                finished(true); reply.send(true, "rewarded", true);
            }
        };
        try {
        ad.setImmersiveMode(true);
        ad.setAdEventCallback(new RewardedAdEventCallback() {
            public void onAdShowedFullScreenContent() { main.post(() -> { outcome.shown(); broadcast(); }); }
            public void onAdDismissedFullScreenContent() { main.post(() -> {
                outcome.closed(); grant.run();
                // Google rewards arrive before dismissal; a short grace also tolerates callback dispatch order.
                main.postDelayed(() -> { if (complete.compareAndSet(false, true)) { outcome.cancel(); finished(false); reply.send(true, "cancelled", false); } }, 250);
            }); }
            public void onAdFailedToShowFullScreenContent(FullScreenContentError error) { main.post(() -> {
                if (complete.compareAndSet(false, true)) { recordError("reward-show", error.getCode() + ": " + error.getMessage()); outcome.cancel(); finished(false); showRewardFeedback("show-failed"); reply.send(false, "show-failed", false); }
            }); }
        });
        broadcast();
        ad.show(activity, item -> main.post(() -> { outcome.earned(); grant.run(); })); }
        catch (RuntimeException error) { if (complete.compareAndSet(false, true)) { recordError("reward-show", error.toString()); outcome.cancel(); finished(false); showRewardFeedback("show-failed"); reply.send(false, "show-failed", false); } }
    }

    private void showRewardFeedback(String status) {
        if (!alive() || !resumed) return;
        String text;
        switch (status) {
            case "consent-pending": text = "Checking ad privacy settings. Please try again shortly."; break;
            case "consent-unavailable": text = "Ad privacy settings are unavailable. Check your connection and retry."; break;
            case "initializing": text = "Ad service is starting. Please try again shortly."; break;
            case "initialization-failed": text = "Ad service could not start. Please try again."; break;
            case "loading": text = "Ad is loading. Please tap again shortly."; break;
            case "load-failed": text = "Ad is unavailable. Check your connection and retry."; break;
            case "busy": text = "Finish the current ad or privacy form, then retry."; break;
            default: text = "Ad could not be shown. Please retry.";
        }
        if (adToast != null) adToast.cancel();
        adToast = Toast.makeText(activity, text, Toast.LENGTH_LONG);
        adToast.show();
        Log.i(TAG, "reward request result=" + status);
    }

    private void showInterstitial(Reply reply, String attempt, int level) {
        preload();
        if (!policy.beginSettlement(attempt, level, inter != null, allowed(), now())) { reply.send(true, "skipped", false); return; }
        InterstitialAd ad = inter; inter = null;
        AtomicBoolean complete = new AtomicBoolean();
        AtomicBoolean shown = new AtomicBoolean();
        main.postDelayed(() -> {
            if (complete.compareAndSet(false, true)) { recoverMissingCallback(); reply.send(false, "callback-timeout", false); }
        }, 120_000);
        try {
        ad.setImmersiveMode(true);
        ad.setAdEventCallback(new InterstitialAdEventCallback() {
            public void onAdShowedFullScreenContent() { main.post(() -> { shown.set(true); broadcast(); }); }
            public void onAdDismissedFullScreenContent() { main.post(() -> { if (complete.compareAndSet(false, true)) { finished(shown.get()); reply.send(true, "closed", false); } }); }
            public void onAdFailedToShowFullScreenContent(FullScreenContentError error) { main.post(() -> { if (complete.compareAndSet(false, true)) { finished(false); reply.send(false, "show-failed", false); } }); }
        });
        broadcast();
        ad.show(activity); }
        catch (RuntimeException ignored) { if (complete.compareAndSet(false, true)) { finished(false); reply.send(false, "show-failed", false); } }
    }

    private void trySplash() {
        if (!startupRequested || !policy.beginStartup(splash != null, allowed(), now())) return;
        AppOpenAd ad = splash; splash = null;
        AtomicBoolean complete = new AtomicBoolean();
        main.postDelayed(() -> { if (complete.compareAndSet(false, true)) recoverMissingCallback(); }, 120_000);
        Runnable finish = () -> { if (complete.compareAndSet(false, true)) finished(false); };
        try {
        ad.setImmersiveMode(true);
        ad.setAdEventCallback(new AppOpenAdEventCallback() {
            public void onAdDismissedFullScreenContent() { main.post(finish); }
            public void onAdFailedToShowFullScreenContent(FullScreenContentError error) { main.post(finish); }
        });
        broadcast();
        ad.show(activity); } catch (RuntimeException ignored) { finish.run(); }
    }

    private void showPrivacy(Reply reply) {
        if (!privacyRequired() || !policy.beginPrivacy(now())) { reply.send(false, "privacy-options-unavailable", false); return; }
        adsAllowed = false;
        consentGeneration++;
        consentAttempt.invalidate(); initialFormPending = false; consentStatus = "form";
        rewardAttempt.invalidate(); interAttempt.invalidate(); splashAttempt.invalidate();
        reward = null; inter = null; splash = null;
        AtomicBoolean complete = new AtomicBoolean();
        main.postDelayed(() -> {
            if (complete.compareAndSet(false, true)) { recoverMissingCallback(); reply.send(false, "callback-timeout", false); }
        }, 290_000);
        broadcast();
        try { UserMessagingPlatform.showPrivacyOptionsForm(activity, error -> {
            if (complete.compareAndSet(false, true)) {
                finished(false);
                finishConsent();
                reply.send(error == null, error == null ? "privacy-updated" : "privacy-error", false);
            }
        }); } catch (RuntimeException ignored) {
            if (complete.compareAndSet(false, true)) { finished(false); finishConsent(); reply.send(false, "privacy-error", false); }
        }
    }
}
