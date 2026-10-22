import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Fault-injection against the actual Java method, using a small window contract
// substitute. This is not an Android runtime, device, WebView, or OEM test.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.join(root, '.codex-temp/google-play-crash-20261020/immersive-regression');
const currentPath = path.join(root, 'android-google-play/app/src/main/java/com/blockout/app/MainActivity.java');
const beforePath = path.join(root, '.codex-temp/google-play-crash-20261020/MainActivity-before.java');
const javaBin = path.join(root, '.codex-temp/android-toolchain/jdk-17/bin');
const sha = value => createHash('sha256').update(value).digest('hex');
const before = readFileSync(beforePath, 'utf8');
const current = readFileSync(currentPath, 'utf8');

// Ignore Java comments/strings when counting braces, preserving the exact
// original source slice that javac compiles.
function method(source, signature) {
  const start = source.indexOf(signature);
  assert(start >= 0 && source.indexOf(signature, start + 1) < 0,
    `Expected one method signature: ${signature}`);
  const body = source.indexOf('{', start);
  let depth = 0;
  let state = 'code';
  for (let i = body; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];
    if (state === 'line') {
      if (char === '\n') state = 'code';
    } else if (state === 'block') {
      if (char === '*' && next === '/') { state = 'code'; i++; }
    } else if (state === 'string' || state === 'char') {
      if (char === '\\') i++;
      else if (char === (state === 'string' ? '"' : "'")) state = 'code';
    } else if (char === '/' && next === '/') { state = 'line'; i++; }
    else if (char === '/' && next === '*') { state = 'block'; i++; }
    else if (char === '"') state = 'string';
    else if (char === "'") state = 'char';
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Unclosed method: ${signature}`);
}

const fixedOnCreate = method(current, 'protected void onCreate(');
const beforeOnCreate = method(before, 'protected void onCreate(');
for (const source of [fixedOnCreate, beforeOnCreate]) {
  assert(source.includes('setContentView(content)'), 'Missing content installation');
  assert(source.includes('enterImmersiveMode()'), 'Missing first immersive entry');
}
assert(fixedOnCreate.indexOf('setContentView(content)') < fixedOnCreate.indexOf('enterImmersiveMode()'));
assert(beforeOnCreate.indexOf('enterImmersiveMode()') < beforeOnCreate.indexOf('setContentView(content)'));
assert.match(method(current, 'protected void onResume('), /\benterImmersiveMode\(\)/);
assert.match(method(current, 'public void onWindowFocusChanged('), /if \(hasFocus && !destroyed\) enterImmersiveMode\(\)/);

const contract = `
    private static final int BACKGROUND = 0xff100b37;
    private final Window window = new Window();
    private Window getWindow() { return window; }
    private static final class Build {
        static final class VERSION { static int SDK_INT; }
        static final class VERSION_CODES { static final int P = 28, R = 30; }
    }
    private static final class WindowManager {
        static final class LayoutParams {
            static final int LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES = 1;
            int layoutInDisplayCutoutMode;
        }
    }
    private static final class WindowInsets {
        static final class Type { static int systemBars() { return 3; } }
    }
    private static final class WindowInsetsController {
        static final int BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE = 2;
        int behavior, hiddenTypes, hideCalls;
        void setSystemBarsBehavior(int behavior) { this.behavior = behavior; }
        void hide(int types) { hiddenTypes = types; hideCalls++; }
    }
    private static final class View {
        static final int SYSTEM_UI_FLAG_LAYOUT_STABLE = 256;
        static final int SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN = 1024;
        static final int SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION = 512;
        static final int SYSTEM_UI_FLAG_FULLSCREEN = 4;
        static final int SYSTEM_UI_FLAG_HIDE_NAVIGATION = 2;
        static final int SYSTEM_UI_FLAG_IMMERSIVE_STICKY = 4096;
        boolean attached;
        int uiFlags, fallbackCalls, controllerQueries;
        final WindowInsetsController controller = new WindowInsetsController();
        WindowInsetsController getWindowInsetsController() {
            require(Build.VERSION.SDK_INT >= 30, "View controller accessed below API 30");
            controllerQueries++;
            return attached ? controller : null;
        }
        void setSystemUiVisibility(int flags) { uiFlags = flags; fallbackCalls++; }
    }
    private static final class Window {
        View decor;
        final WindowManager.LayoutParams attributes = new WindowManager.LayoutParams();
        int statusColor, navigationColor, fitCalls, attributeUpdates, unsafeControllerCalls;
        boolean fitsSystemWindows = true;
        View getDecorView() {
            if (decor == null) decor = new View();
            return decor;
        }
        WindowInsetsController getInsetsController() {
            require(Build.VERSION.SDK_INT >= 30, "Window controller accessed below API 30");
            unsafeControllerCalls++;
            // Exact null receiver failure in the supplied PhoneWindow log:
            // mDecor.getWindowInsetsController() before decor installation.
            return decor.getWindowInsetsController();
        }
        void setStatusBarColor(int color) { statusColor = color; }
        void setNavigationBarColor(int color) { navigationColor = color; }
        WindowManager.LayoutParams getAttributes() { return attributes; }
        void setAttributes(WindowManager.LayoutParams attributes) {
            require(Build.VERSION.SDK_INT >= 28, "Cutout mode changed below API 28");
            attributeUpdates++;
        }
        void setDecorFitsSystemWindows(boolean fits) {
            require(Build.VERSION.SDK_INT >= 30, "Decor fit API accessed below API 30");
            fitsSystemWindows = fits;
            fitCalls++;
        }
    }
    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
`;

const baselineCases = `
    public static void main(String[] args) {
        Build.VERSION.SDK_INT = 30;
        BeforeHarness cold = new BeforeHarness();
        try {
            cold.enterImmersiveMode();
            throw new AssertionError("The old method must reproduce the cold-decor NullPointerException");
        } catch (NullPointerException expected) {
            require(cold.window.decor == null, "Baseline failure must occur before decor creation");
            require(cold.window.unsafeControllerCalls == 1, "Baseline must use failing window API");
            System.out.println("{\\"case\\":\\"baseline-api30-no-decor\\",\\"status\\":\\"EXPECTED_NPE_REPRODUCED\\"}");
        }
        BeforeHarness unattached = new BeforeHarness();
        unattached.window.getDecorView();
        unattached.enterImmersiveMode();
        require(unattached.window.decor.fallbackCalls == 0,
            "Baseline with decor but no controller unexpectedly falls back");
        System.out.println("{\\"case\\":\\"baseline-api30-unattached-decor\\",\\"status\\":\\"MISSING_FALLBACK_REPRODUCED\\"}");
    }
`;

const fixedCases = `
    private static void assertBase(FixedHarness harness, int api) {
        require(harness.window.decor != null, "Decor missing");
        require(harness.window.unsafeControllerCalls == 0, "Unsafe Window API was called");
        require(harness.window.statusColor == BACKGROUND, "Status color changed");
        require(harness.window.navigationColor == BACKGROUND, "Navigation color changed");
        require(harness.window.attributes.layoutInDisplayCutoutMode == (api >= 28 ? 1 : 0),
            "Cutout guard mismatch");
    }
    public static void main(String[] args) {
        for (int api : new int[] {24, 28, 29, 30, 35, 36}) {
            Build.VERSION.SDK_INT = api;
            FixedHarness harness = new FixedHarness();
            harness.enterImmersiveMode();
            assertBase(harness, api);
            require(harness.window.decor.uiFlags == 5894, "Incomplete immersive fallback flags");
            require(harness.window.decor.fallbackCalls == 1, "Missing pre-attach fallback");
            require(harness.window.fitCalls == (api >= 30 ? 1 : 0), "Decor fit API guard");
            require(harness.window.decor.controllerQueries == (api >= 30 ? 1 : 0), "Controller API guard");
            System.out.println("{\\"case\\":\\"fixed-api" + api + "-cold-unattached\\",\\"status\\":\\"PASS\\"}");
        }
        for (int api : new int[] {30, 35, 36}) {
            Build.VERSION.SDK_INT = api;
            FixedHarness harness = new FixedHarness();
            harness.window.getDecorView().attached = true;
            harness.enterImmersiveMode();
            assertBase(harness, api);
            require(!harness.window.fitsSystemWindows, "Window must allow full-screen layout");
            require(harness.window.decor.controller.hiddenTypes == 3, "System bars not hidden");
            require(harness.window.decor.controller.behavior == 2, "Swipe behavior not set");
            require(harness.window.decor.fallbackCalls == 0, "Modern success must not also write legacy flags");
            System.out.println("{\\"case\\":\\"fixed-api" + api + "-attached\\",\\"status\\":\\"PASS\\"}");
        }
        Build.VERSION.SDK_INT = 30;
        FixedHarness retry = new FixedHarness();
        retry.enterImmersiveMode();
        retry.window.decor.attached = true;
        for (int i = 0; i < 3; i++) retry.enterImmersiveMode();
        require(retry.window.decor.fallbackCalls == 1, "Fallback must stop once controller exists");
        require(retry.window.decor.controller.hideCalls == 3, "Repeated attach/focus/resume entry must hide bars");
        require(retry.window.decor.controller.behavior == 2, "Repeated entry lost swipe behavior");
        require(retry.window.unsafeControllerCalls == 0, "Retry called unsafe window API");
        System.out.println("{\\"case\\":\\"fixed-api30-attach-and-repeated-entry\\",\\"status\\":\\"PASS\\"}");
    }
`;

mkdirSync(evidence, { recursive: true });
const results = [];
for (const [name, source, cases] of [
  ['BeforeHarness', before, baselineCases],
  ['FixedHarness', current, fixedCases],
]) {
  const harness = `public final class ${name} {\n${contract}\n`
    + method(source, 'private void enterImmersiveMode()') + '\n' + cases + '\n}\n';
  const harnessPath = path.join(evidence, `${name}.java`);
  writeFileSync(harnessPath, harness);
  execFileSync(path.join(javaBin, 'javac.exe'), ['-encoding', 'UTF-8', '-d', evidence, harnessPath],
    { cwd: root, encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
  const output = execFileSync(path.join(javaBin, 'java.exe'), ['-cp', evidence, name],
    { cwd: root, encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
  writeFileSync(path.join(evidence, `${name}.log`), output);
  results.push(...output.trim().split(/\r?\n/).map(line => JSON.parse(line)));
}
const report = {
  schemaVersion: 1,
  status: 'PASS',
  kind: 'EXTRACTED_ACTUAL_METHOD_JAVA_WINDOW_CONTRACT_FAULT_INJECTION',
  createdAt: new Date().toISOString(),
  currentSource: { path: path.relative(root, currentPath), sha256: sha(current) },
  baselineSource: { path: path.relative(root, beforePath), sha256: sha(before) },
  toolSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  sourceOrderChecks: {
    baselineCallsImmersiveBeforeSetContentView: true,
    fixedCallsImmersiveAfterSetContentView: true,
    onResumeRetainsImmersiveEntry: true,
    focusRetainsGuardedImmersiveEntry: true,
  },
  cases: results,
  limitation: 'Java contract substitutes model lazy decor creation and a nullable pre-attach controller. This does not run Android, MainActivity.onCreate(), lifecycle callbacks, WebView, advertisements, or an OEM device. Lifecycle entry preservation and onCreate order are source checks; only the exact extracted immersive method executes.',
  sourceReferences: [
    'User logcat(1).txt: PhoneWindow.getInsetsController -> MainActivity.enterImmersiveMode:86 -> MainActivity.onCreate:59',
    'https://developer.android.com/reference/android/view/Window#getDecorView()',
    'https://developer.android.com/reference/android/view/Window#getInsetsController()',
  ],
};
const reportPath = path.join(evidence, 'report.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, baselineReproductions: 2, fixedCases: 10, reportPath }, null, 2));
