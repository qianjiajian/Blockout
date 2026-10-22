package com.blockout.app;

import android.app.Activity;
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
import androidx.annotation.Nullable;
import androidx.webkit.WebResourceErrorCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

public final class MainActivity extends Activity {
    private static final String TAG = "BlockOut";
    private static final String START_URL = "https://appassets.androidplatform.net/index.html";
    private static final int BACKGROUND = Color.rgb(16, 11, 55);
    private FrameLayout content;
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private boolean destroyed;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(
                (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        enterImmersiveMode();
        content = new FrameLayout(this);
        content.setBackgroundColor(BACKGROUND);
        content.setOnApplyWindowInsetsListener((view, insets) -> applySafeInsets(insets));
        setContentView(content);
        content.requestApplyInsets();
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        startWebView();
    }

    /** Keep the game in immersive mode after MIUI/system gestures temporarily reveal bars. */
    @SuppressWarnings("deprecation")
    private void enterImmersiveMode() {
        Window window = getWindow();
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
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.hide(WindowInsets.Type.systemBars());
            }
            return;
        }
        int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
        window.getDecorView().setSystemUiVisibility(flags);
    }

    // Native padding protects a physical display cutout on devices whose
    // WebView does not forward it through CSS safe-area-inset. The immersive
    // system bars stay hidden and their insets are consumed for the child.
    @SuppressWarnings("deprecation")
    private WindowInsets applySafeInsets(WindowInsets insets) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // System bars are deliberately hidden by immersive mode. Only a
            // physical display cutout still needs layout padding; applying
            // status/navigation insets here would recreate the black bands
            // that edge-to-edge mode is meant to remove.
            int systemBars = WindowInsets.Type.systemBars();
            int cutoutType = WindowInsets.Type.displayCutout();
            android.graphics.Insets cutout = insets.getInsets(cutoutType);
            content.setPadding(cutout.left, cutout.top, cutout.right, cutout.bottom);
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
        content.setPadding(left, top, right, bottom);
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
            showFailure("无法启动游戏", "系统网页组件暂时无法使用。请在系统设置或应用商店中启用、更新 Android System WebView 后重试。", true);
        }
    }

    private void configureWebView(WebView view) {
        view.setWebViewClient(new WebViewClientCompat() {
            @Override
            @Nullable
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            @Nullable
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return assetLoader.shouldInterceptRequest(Uri.parse(url));
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceErrorCompat error) {
                if (view != webView || !request.isForMainFrame()) return;
                String code = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_RESOURCE_ERROR_GET_CODE)
                        ? Integer.toString(error.getErrorCode()) : "unknown";
                CharSequence description = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_RESOURCE_ERROR_GET_DESCRIPTION)
                        ? error.getDescription() : "unavailable";
                Log.e(TAG, "Main page load failed: " + code + " " + description);
                showFailure("游戏加载失败", "游戏页面暂时无法打开，请点击重试。已保存的进度不会被清除。", true);
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (view != webView || !request.isForMainFrame()) return;
                Log.e(TAG, "Main page HTTP error: " + response.getStatusCode());
                showFailure("游戏加载失败", "游戏页面暂时无法打开，请点击重试。已保存的进度不会被清除。", true);
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                if (view != webView) return true;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    Log.e(TAG, "WebView renderer exited; didCrash=" + detail.didCrash());
                }
                // A terminated renderer's WebView cannot be reused. Recovery is
                // explicit to avoid retry loops on low-memory or broken devices.
                showFailure("游戏画面已中断", "请点击重试重新打开游戏。已保存的进度不会被清除，未完成的本局需要重新开始。", false);
                return true;
            }
        });
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
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
        retry.setText("重试");
        retry.setOnClickListener(view -> startWebView());
        panel.addView(retry);
        content.addView(panel, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private void releaseWebView(boolean stopLoading) {
        WebView previous = webView;
        webView = null;
        if (previous == null) return;
        if (previous.getParent() instanceof ViewGroup) {
            ((ViewGroup) previous.getParent()).removeView(previous);
        }
        if (stopLoading) previous.stopLoading();
        previous.destroy();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        enterImmersiveMode();
        if (webView != null) webView.onResume();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && !destroyed) enterImmersiveMode();
    }

    @Override
    protected void onDestroy() {
        destroyed = true;
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
