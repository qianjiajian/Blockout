/* Deliberately ES5: this must work even when the game module cannot be parsed. */
(function () {
  "use strict";
  var panel = document.getElementById("startup-status");
  var retry = document.getElementById("startup-retry");
  var finished = false;
  var failed = false;
  var timeout;
  function stopWatching() {
    window.clearTimeout(timeout);
    window.removeEventListener("error", onError, true);
    window.removeEventListener("unhandledrejection", onRejection);
  }
  function fail(reason, unsupported) {
    if (finished || failed) return;
    failed = true;
    stopWatching();
    panel.setAttribute("role", "alert");
    document.getElementById("startup-title").textContent = unsupported ? "需要更新运行环境" : "游戏启动未完成";
    document.getElementById("startup-message").textContent = unsupported
      ? "请更新手机的 Android System WebView（安卓系统网页组件）或浏览器，再重新打开游戏。"
      : "请重新打开游戏；若仍无法启动，请将下方问题详情发给开发者。";
    document.getElementById("startup-details").textContent = String(reason) + "\n" + navigator.userAgent;
    document.getElementById("startup-diagnostics").hidden = false;
    retry.hidden = false;
  }
  function onError(event) {
    if (event.target && event.target.tagName === "SCRIPT") fail("游戏脚本加载失败", false);
    else if (event.message) fail(event.message, false);
  }
  function onRejection(event) {
    fail(event.reason && event.reason.message ? event.reason.message : String(event.reason), false);
  }
  window.__BLOCK_OUT_STARTUP__ = {
    supported: true,
    ready: function () {
      if (failed) return;
      finished = true;
      stopWatching();
      panel.hidden = true;
    }
  };
  retry.addEventListener("click", function () { window.location.reload(); });
  window.addEventListener("error", onError, true);
  window.addEventListener("unhandledrejection", onRejection);
  try {
    // Probe capabilities, not phone names or a spoofable browser version.
    if (!("noModule" in document.createElement("script"))) throw new Error("JavaScript modules unavailable");
    if (new Function("return ({ value: 1 })?.value ?? 0;")() !== 1) throw new Error("Modern JavaScript syntax unavailable");
    if (!window.Promise || !Promise.allSettled || !Object.fromEntries || !Array.prototype.flat || !Array.prototype.flatMap
      || !window.AbortController || !window.fetch || !window.PointerEvent || !window.requestAnimationFrame) {
      throw new Error("Required browser APIs unavailable");
    }
    if (!document.createElement("canvas").getContext("2d")) throw new Error("Canvas 2D unavailable");
    timeout = window.setTimeout(function () { fail("启动等待超过 30 秒", false); }, 30000);
  } catch (error) {
    window.__BLOCK_OUT_STARTUP__.supported = false;
    fail(error && error.message ? error.message : error, true);
  }
}());
