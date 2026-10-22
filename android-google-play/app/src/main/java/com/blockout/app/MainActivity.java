package com.blockout.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.DisplayCutout;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.util.Collections;
import androidx.annotation.Nullable;
import androidx.webkit.WebResourceErrorCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

public final class MainActivity extends Activity {
    private static final String TAG = "BlockOut";
    private static final String START_URL = "https://appassets.androidplatform.net/index.html";
    private static final String PRIVACY_URL =
            "https://sweetpotato-net.web.app/privacy.html?bundle=com.SlideJam.SweetPotato";
    private static final String SUPPORT_EMAIL_URL = "mailto:hongshugame@gmail.com";
    private static final int BACKGROUND = Color.rgb(16, 11, 55);
    private FrameLayout content;
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private GooglePlaySdkBridge sdkBridge;
    private boolean destroyed;
    private int safeLeft, safeTop, safeRight, safeBottom;

    /** WebView stays edge-to-edge; only interactive content avoids the cutout.
     * Convert physical pixels using the actual WebView/CSS viewport ratio. */
    private void publishSafeInsets() {
        WebView target = webView;
        if (target == null || destroyed) return;
        target.post(() -> {
            if (target != webView || destroyed || target.getWidth() <= 0) return;
            target.evaluateJavascript("(function(){var r=window.innerWidth/" + target.getWidth()
                    + ",s=document.documentElement.style;"
                    + "s.setProperty('--color-escape-safe-left',(" + safeLeft + "*r)+'px');"
                    + "s.setProperty('--color-escape-safe-top',(" + safeTop + "*r)+'px');"
                    + "s.setProperty('--color-escape-safe-right',(" + safeRight + "*r)+'px');"
                    + "s.setProperty('--color-escape-safe-bottom',(" + safeBottom + "*r)+'px');"
                    + "window.dispatchEvent(new Event('resize'));})()", null);
        });
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(
                (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        content = new FrameLayout(this);
        content.setBackgroundColor(BACKGROUND);
        content.setOnApplyWindowInsetsListener((view, insets) -> applySafeInsets(insets));
        setContentView(content);
        enterImmersiveMode();
        content.requestApplyInsets();
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        sdkBridge = new GooglePlaySdkBridge(this);
        startWebView();
    }

    /** Keep the game in immersive mode after MIUI/system gestures temporarily reveal bars. */
    @SuppressWarnings("deprecation")
    private void enterImmersiveMode() {
        Window window = getWindow();
        // PhoneWindow.getInsetsController() can dereference an uncreated decor
        // on Android 11/OEM builds. Create the decor before touching its controller.
        View decor = window.getDecorView();
        window.setStatusBarColor(BACKGROUND);
        window.setNavigationBarColor(BACKGROUND);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams attributes = window.getAttributes();
            attributes.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(attributes);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
            WindowInsetsController controller = decor.getWindowInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.hide(WindowInsets.Type.systemBars());
                return;
            }
            // The decor exists but may not yet be attached during onCreate.
            // Apply legacy flags now; onResume/window focus retries the modern API.
        }
        int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
        decor.setSystemUiVisibility(flags);
    }

    // Desktop captions exclude window content. Physical cutouts are forwarded
    // to the renderer instead of creating a blank band around the WebView.
    @SuppressWarnings("deprecation")
    private WindowInsets applySafeInsets(WindowInsets insets) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Ordinary status/navigation bars stay hidden in immersive mode.
            // Desktop window captions remain visible, including for games,
            // so protect them together with any physical display cutout.
            int systemBars = WindowInsets.Type.systemBars();
            int cutoutType = WindowInsets.Type.displayCutout();
            android.graphics.Insets cutout = insets.getInsets(cutoutType);
            android.graphics.Insets caption = insets.getInsets(WindowInsets.Type.captionBar());
            content.setPadding(caption.left, caption.top, caption.right, caption.bottom);
            safeLeft = Math.max(0, cutout.left - caption.left);
            safeTop = Math.max(0, cutout.top - caption.top);
            safeRight = Math.max(0, cutout.right - caption.right);
            safeBottom = Math.max(0, cutout.bottom - caption.bottom);
            publishSafeInsets();
            return new WindowInsets.Builder(insets)
                    .setInsets(systemBars, android.graphics.Insets.NONE)
                    .setInsetsIgnoringVisibility(systemBars, android.graphics.Insets.NONE)
                    .setInsets(cutoutType, android.graphics.Insets.NONE)
                    .setInsetsIgnoringVisibility(cutoutType, android.graphics.Insets.NONE)
                    .setDisplayCutout(null)
                    .build();
        }
        int left = 0;
        int top = 0;
        int right = 0;
        int bottom = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            DisplayCutout cutout = insets.getDisplayCutout();
            if (cutout != null) {
                left = Math.max(left, cutout.getSafeInsetLeft());
                top = Math.max(top, cutout.getSafeInsetTop());
                right = Math.max(right, cutout.getSafeInsetRight());
                bottom = Math.max(bottom, cutout.getSafeInsetBottom());
            }
        }
        content.setPadding(0, 0, 0, 0);
        safeLeft = left; safeTop = top; safeRight = right; safeBottom = bottom;
        publishSafeInsets();
        WindowInsets remaining = insets.replaceSystemWindowInsets(0, 0, 0, 0);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            remaining = remaining.consumeDisplayCutout();
        }
        return remaining;
    }

    private void startWebView() {
        if (destroyed) return;
        releaseWebView(true);
        content.removeAllViews();
        try {
            PackageInfo provider = WebViewCompat.getCurrentWebViewPackage(this);
            Log.i(TAG, "Android=" + Build.VERSION.RELEASE + " SDK=" + Build.VERSION.SDK_INT
                    + " WebView=" + (provider == null ? "unknown" : provider.packageName + "/" + provider.versionName));
            webView = new WebView(this);
            webView.setBackgroundColor(BACKGROUND);
            configureWebView(webView);
            content.addView(webView, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            webView.requestApplyInsets();
            webView.loadUrl(START_URL);
        } catch (RuntimeException exception) {
            Log.e(TAG, "Unable to initialize WebView", exception);
            showFailure("Unable to start the game", "Android System WebView is unavailable. Enable or update it in your device settings or app store, then try again.", true);
        }
    }

    private void configureWebView(WebView view) {
        view.setWebViewClient(new WebViewClientCompat() {
            @Override
            public void onPageFinished(WebView view, String url) {
                if (view == webView && !destroyed) publishSafeInsets();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (view != webView || destroyed) return true;
                return handleNavigation(request.getUrl(), request.isForMainFrame());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (view != webView || destroyed || url == null) return true;
                return handleNavigation(Uri.parse(url), true);
            }

            @Override
            @Nullable
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!isBundledOrigin(request.getUrl())) return blockedResource();
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            @Nullable
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                Uri uri = Uri.parse(url);
                if (!isBundledOrigin(uri)) return blockedResource();
                return assetLoader.shouldInterceptRequest(uri);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceErrorCompat error) {
                if (view != webView || !request.isForMainFrame()) return;
                String code = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_RESOURCE_ERROR_GET_CODE)
                        ? Integer.toString(error.getErrorCode()) : "unknown";
                CharSequence description = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_RESOURCE_ERROR_GET_DESCRIPTION)
                        ? error.getDescription() : "unavailable";
                Log.e(TAG, "Main page load failed: " + code + " " + description);
                showFailure("Game loading failed", "The game could not open. Tap Retry to try again. Your saved progress will be kept.", true);
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (view != webView || !request.isForMainFrame()) return;
                Log.e(TAG, "Main page HTTP error: " + response.getStatusCode());
                showFailure("Game loading failed", "The game could not open. Tap Retry to try again. Your saved progress will be kept.", true);
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                if (view != webView) return true;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    Log.e(TAG, "WebView renderer exited; didCrash=" + detail.didCrash());
                }
                // A terminated renderer's WebView cannot be reused. Recovery is
                // explicit to avoid retry loops on low-memory or broken devices.
                showFailure("The game was interrupted", "Tap Retry to reopen the game. Your saved progress will be kept, but the unfinished level will restart.", false);
                return true;
            }
        });
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        if (sdkBridge != null) sdkBridge.attach(view);
    }

    private static boolean isBundledOrigin(Uri uri) {
        return "https".equals(uri.getScheme())
                && "appassets.androidplatform.net".equals(uri.getHost())
                && uri.getPort() == -1 && uri.getUserInfo() == null;
    }

    private static WebResourceResponse blockedResource() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked",
                Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    /** Only the bundled main document runs in this WebView. External links
     * leave the game intact and are never loaded into its storage origin. */
    private boolean handleNavigation(Uri uri, boolean isMainFrame) {
        if (isMainFrame && isBundledOrigin(uri)
                && "/index.html".equals(uri.getPath()) && uri.getQuery() == null) {
            return false; // Same-document privacy/history fragments remain local.
        }
        String rawUrl = uri.toString();
        String action = PRIVACY_URL.equals(rawUrl) ? Intent.ACTION_VIEW
                : SUPPORT_EMAIL_URL.equals(rawUrl) ? Intent.ACTION_SENDTO : null;
        if (!isMainFrame || action == null) return true;
        try {
            Intent intent = new Intent(action, uri);
            if (Intent.ACTION_VIEW.equals(action)) intent.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(intent);
        } catch (ActivityNotFoundException | SecurityException ignored) {
            String message = Intent.ACTION_SENDTO.equals(action)
                    ? "No email app is available. Contact hongshugame@gmail.com."
                    : "No browser is available. Enable a browser and try again.";
            Toast.makeText(this, message, Toast.LENGTH_LONG).show();
        }
        return true;
    }

    private void showFailure(String title, String message, boolean stopLoading) {
        if (destroyed) return;
        releaseWebView(stopLoading);
        content.removeAllViews();
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        int padding = Math.round(24 * getResources().getDisplayMetrics().density);
        panel.setPadding(padding, padding, padding, padding);
        TextView heading = new TextView(this);
        heading.setText(title);
        heading.setTextColor(Color.WHITE);
        heading.setTextSize(22);
        heading.setGravity(Gravity.CENTER);
        panel.addView(heading);
        TextView description = new TextView(this);
        description.setText(message);
        description.setTextColor(Color.rgb(225, 221, 245));
        description.setTextSize(16);
        description.setGravity(Gravity.CENTER);
        description.setPadding(0, padding, 0, padding);
        panel.addView(description);
        Button retry = new Button(this);
        retry.setText("Retry");
        retry.setOnClickListener(view -> startWebView());
        panel.addView(retry);
        content.addView(panel, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private void releaseWebView(boolean stopLoading) {
        WebView previous = webView;
        webView = null;
        if (previous == null) return;
        if (sdkBridge != null) sdkBridge.detach();
        if (previous.getParent() instanceof ViewGroup) {
            ((ViewGroup) previous.getParent()).removeView(previous);
        }
        if (stopLoading) previous.stopLoading();
        previous.destroy();
    }

    @Override
    protected void onPause() {
        if (sdkBridge != null) sdkBridge.pause();
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        enterImmersiveMode();
        if (webView != null) webView.onResume();
        if (sdkBridge != null) sdkBridge.resume();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (sdkBridge != null) sdkBridge.focusChanged(hasFocus);
        if (hasFocus && !destroyed) enterImmersiveMode();
    }

    @Override
    protected void onDestroy() {
        destroyed = true;
        if (sdkBridge != null) sdkBridge.destroy();
        releaseWebView(true);
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
