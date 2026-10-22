"""Run the actual GP bridge against deterministic local SDK/Android doubles.

This does not load real ads, access a device or read a player save. Gradle still
compiles against the real SDK separately. The harness exercises recovery wiring.
"""
from pathlib import Path
import json
import hashlib
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.codex-temp/google-play-performance-20261021/ad-recovery-harness'
SRC = OUT / 'src'
CLASSES = OUT / 'classes'
JDK = ROOT / '.codex-temp/android-toolchain/jdk-17/bin'
files = {}

def add(name, body):
    files[name.replace('.', '/') + '.java'] = body

add('android.app.Activity', '''package android.app;
public class Activity {
 public boolean isFinishing(){return false;} public boolean isDestroyed(){return false;}
 public boolean hasWindowFocus(){return true;} public Object getApplicationContext(){return this;}
 public String getString(int id){return id==1?"real-app-id":"test-ad-unit-"+id;}
 public android.content.SharedPreferences getSharedPreferences(String k,int m){return new android.content.SharedPreferences();}
}''')
add('android.content.SharedPreferences', '''package android.content;
public class SharedPreferences { public int getInt(String k,int d){return d;} public Editor edit(){return new Editor();}
 public static class Editor {public Editor putInt(String k,int v){return this;}public void apply(){}}
}''')
add('android.net.Uri', '''package android.net;
public class Uri {private java.net.URI uri; public static Uri parse(String s){Uri r=new Uri();r.uri=java.net.URI.create(s);return r;}
 public String getScheme(){return uri.getScheme();}public String getHost(){return uri.getHost();}public int getPort(){return uri.getPort();}
 public String getUserInfo(){return uri.getUserInfo();}public String getPath(){return uri.getPath();}public String getQuery(){return uri.getQuery();}}''')
add('android.os.SystemClock', 'package android.os; public class SystemClock {public static long time; public static long elapsedRealtime(){return time;}}')
add('android.os.Looper', 'package android.os; public class Looper {public static Looper getMainLooper(){return new Looper();}}')
add('android.os.Handler', '''package android.os;
public class Handler {
 static class Task {Handler owner;Runnable run;long at;Task(Handler h,Runnable r,long a){owner=h;run=r;at=a;}}
 private static final java.util.List<Task> queue=new java.util.ArrayList<>();
 public Handler(Looper l){} public boolean post(Runnable r){return postDelayed(r,0);}
 public boolean postDelayed(Runnable r,long delay){synchronized(queue){queue.add(new Task(this,r,SystemClock.time+delay));}return true;}
 public void removeCallbacks(Runnable r){synchronized(queue){queue.removeIf(t->t.owner==this&&t.run==r);}}
 public void removeCallbacksAndMessages(Object o){synchronized(queue){queue.removeIf(t->t.owner==this);}}
 public static void flush(){for(int i=0;i<1000;i++){Task next=null;synchronized(queue){for(Task t:queue)if(t.at<=SystemClock.time){next=t;break;}if(next!=null)queue.remove(next);}if(next==null)return;next.run.run();}throw new AssertionError("unbounded handler loop");}
 public static void advance(long delta){SystemClock.time+=delta;flush();}
}''')
add('android.util.Log', '''package android.util;public class Log {public static final java.util.List<String> lines=new java.util.ArrayList<>();
public static int i(String t,String m){lines.add(t+" "+m);return 0;}public static int w(String t,String m){lines.add(t+" "+m);return 0;}}''')
add('android.widget.Toast', '''package android.widget;public class Toast {public static final int LENGTH_LONG=1;public static String last="";
String text;public static Toast makeText(Object a,String t,int d){Toast r=new Toast();r.text=t;return r;}public void show(){last=text;}public void cancel(){}}''')
add('android.webkit.WebView', '''package android.webkit;public class WebView {public String getUrl(){return "https://appassets.androidplatform.net/index.html";}}''')
add('androidx.webkit.JavaScriptReplyProxy', '''package androidx.webkit;public class JavaScriptReplyProxy {public java.util.List<String> messages=new java.util.ArrayList<>();public void postMessage(String s){messages.add(s);}}''')
add('androidx.webkit.WebMessageCompat', '''package androidx.webkit;public class WebMessageCompat {public static final int TYPE_STRING=0;public int getType(){return 0;}public String getData(){return "";}}''')
add('androidx.webkit.WebViewFeature', '''package androidx.webkit;public class WebViewFeature {public static final String WEB_MESSAGE_LISTENER="listener";public static boolean isFeatureSupported(String s){return true;}}''')
add('androidx.webkit.WebViewCompat', '''package androidx.webkit;public class WebViewCompat {
public interface Listener {void receive(android.webkit.WebView v,WebMessageCompat m,android.net.Uri u,boolean b,JavaScriptReplyProxy p);}
public static void addWebMessageListener(android.webkit.WebView v,String n,java.util.Set<String>s,Listener l){}
public static void removeWebMessageListener(android.webkit.WebView v,String n){}}''')
add('org.json.JSONException', 'package org.json; public class JSONException extends Exception {public JSONException(String s){super(s);}}')
add('org.json.JSONObject', '''package org.json;public class JSONObject {
private final java.util.Map<String,Object> data=new java.util.LinkedHashMap<>(); public JSONObject(){}public JSONObject(String s)throws JSONException{throw new JSONException("unused parsing");}
public JSONObject put(String k,Object v)throws JSONException{data.put(k,v);return this;}public Object opt(String k){return data.get(k);}
public JSONObject optJSONObject(String k){return data.get(k) instanceof JSONObject?(JSONObject)data.get(k):null;}
public String optString(String k){Object v=data.get(k);return v==null?"":v.toString();}public double optDouble(String k,double d){Object v=data.get(k);return v instanceof Number?((Number)v).doubleValue():d;}
public String toString(){StringBuilder s=new StringBuilder("{");for(java.util.Map.Entry<String,Object>e:data.entrySet()){if(s.length()>1)s.append(',');s.append('"').append(e.getKey()).append("\\\":");Object v=e.getValue();if(v instanceof String)s.append('"').append(((String)v).replace("\\\\","\\\\\\\\").replace("\\\"","\\\\\\\"")).append('"');else s.append(v);}return s.append('}').toString();}}
''')
add('com.google.android.ump.FormError', '''package com.google.android.ump;public class FormError {public int getErrorCode(){return 2;}public String getMessage(){return "simulated offline";}}''')
add('com.google.android.ump.ConsentRequestParameters', '''package com.google.android.ump;public class ConsentRequestParameters {public static class Builder {public ConsentRequestParameters build(){return new ConsentRequestParameters();}}}''')
add('com.google.android.ump.ConsentInformation', '''package com.google.android.ump;public class ConsentInformation {
 public enum PrivacyOptionsRequirementStatus {REQUIRED,NOT_REQUIRED} public boolean allowed;public int requests;
 public Runnable success;public java.util.function.Consumer<FormError> failure;
 public boolean canRequestAds(){return allowed;}public PrivacyOptionsRequirementStatus getPrivacyOptionsRequirementStatus(){return PrivacyOptionsRequirementStatus.REQUIRED;}
 public void requestConsentInfoUpdate(android.app.Activity a,ConsentRequestParameters p,Runnable s,java.util.function.Consumer<FormError> f){requests++;success=s;failure=f;}
}''')
add('com.google.android.ump.UserMessagingPlatform', '''package com.google.android.ump;public class UserMessagingPlatform {
public static ConsentInformation info=new ConsentInformation();public static java.util.function.Consumer<FormError> form;
public static ConsentInformation getConsentInformation(android.app.Activity a){return info;}
public static void loadAndShowConsentFormIfRequired(android.app.Activity a,java.util.function.Consumer<FormError> cb){form=cb;}
public static void showPrivacyOptionsForm(android.app.Activity a,java.util.function.Consumer<FormError> cb){form=cb;}}
''')
add('com.google.android.libraries.ads.mobile.sdk.initialization.InitializationConfig', '''package com.google.android.libraries.ads.mobile.sdk.initialization;
public class InitializationConfig {public static class Builder {public Builder(String s){}public InitializationConfig build(){return new InitializationConfig();}}}''')
add('com.google.android.libraries.ads.mobile.sdk.MobileAds', '''package com.google.android.libraries.ads.mobile.sdk;public class MobileAds {
 public static volatile int calls;public static volatile boolean fail;public static volatile java.util.function.Consumer<Object> callback;
 public static void initialize(Object a,com.google.android.libraries.ads.mobile.sdk.initialization.InitializationConfig c,java.util.function.Consumer<Object> cb){calls++;if(fail)throw new IllegalStateException("simulated init failure");callback=cb;}}
''')
add('com.google.android.libraries.ads.mobile.sdk.common.AdRequest', '''package com.google.android.libraries.ads.mobile.sdk.common;public class AdRequest {public static class Builder {public Builder(String id){}public AdRequest build(){return new AdRequest();}}}''')
add('com.google.android.libraries.ads.mobile.sdk.common.AdLoadCallback', '''package com.google.android.libraries.ads.mobile.sdk.common;public abstract class AdLoadCallback<T> {public abstract void onAdLoaded(T ad);public abstract void onAdFailedToLoad(LoadAdError error);}''')
for error in ['LoadAdError', 'FullScreenContentError']:
    add('com.google.android.libraries.ads.mobile.sdk.common.' + error, f'''package com.google.android.libraries.ads.mobile.sdk.common;public class {error} {{public String getCode(){{return "NETWORK_ERROR";}}public String getMessage(){{return "simulated no connection";}}}}''')
for package, cls in [('rewarded','RewardedAd'),('interstitial','InterstitialAd'),('appopen','AppOpenAd')]:
    prefix = 'com.google.android.libraries.ads.mobile.sdk.' + package
    add(prefix + '.' + cls + 'EventCallback', f'''package {prefix};public class {cls}EventCallback {{
public void onAdShowedFullScreenContent(){{}}public void onAdDismissedFullScreenContent(){{}}
public void onAdFailedToShowFullScreenContent(com.google.android.libraries.ads.mobile.sdk.common.FullScreenContentError error){{}}}}''')
    reward_extra = 'public java.util.function.Consumer<Object> earned;public void show(android.app.Activity a,java.util.function.Consumer<Object> cb){shows++;earned=cb;}' if cls == 'RewardedAd' else 'public void show(android.app.Activity a){shows++;}'
    add(prefix + '.' + cls, f'''package {prefix};import com.google.android.libraries.ads.mobile.sdk.common.*;public class {cls} {{
public static AdLoadCallback<{cls}> callback;public static int loads,shows;public {cls}EventCallback event;
public static void load(AdRequest r,AdLoadCallback<{cls}> cb){{loads++;callback=cb;}}
public void setImmersiveMode(boolean b){{}}public void setAdEventCallback({cls}EventCallback e){{event=e;}}{reward_extra}}}''')
add('com.blockout.app.R', '''package com.blockout.app;public class R {public static class string {public static int admob_app_id=1,reward_unit_id=2,inter_unit_id=3,splash_unit_id=4;}}''')
add('com.blockout.app.RecoveryHarness', '''package com.blockout.app;
import android.os.Handler;import android.widget.Toast;import android.webkit.WebView;import androidx.webkit.JavaScriptReplyProxy;
import com.google.android.ump.*;import com.google.android.libraries.ads.mobile.sdk.MobileAds;
import com.google.android.libraries.ads.mobile.sdk.rewarded.RewardedAd;import com.google.android.libraries.ads.mobile.sdk.common.*;
public class RecoveryHarness {
 static GooglePlaySdkBridge bridge;static WebView view;static int id;static int checks;
 static void require(boolean ok,String msg){if(!ok)throw new AssertionError(msg);checks++;}
 static JavaScriptReplyProxy tap()throws Exception{JavaScriptReplyProxy proxy=new JavaScriptReplyProxy();Class<?> reply=Class.forName("com.blockout.app.GooglePlaySdkBridge$Reply");java.lang.reflect.Constructor<?> c=reply.getDeclaredConstructor(GooglePlaySdkBridge.class,WebView.class,JavaScriptReplyProxy.class,String.class);c.setAccessible(true);Object r=c.newInstance(bridge,view,proxy,"test-"+(++id));java.lang.reflect.Method m=GooglePlaySdkBridge.class.getDeclaredMethod("showReward",reply);m.setAccessible(true);m.invoke(bridge,r);Handler.flush();return proxy;}
 static void waitFor(java.util.function.BooleanSupplier ok)throws Exception{for(int i=0;i<200&&!ok.getAsBoolean();i++){Thread.sleep(5);Handler.flush();}require(ok.getAsBoolean(),"background task completed");}
 public static void main(String[]args)throws Exception{
  java.util.Locale.setDefault(java.util.Locale.ENGLISH);bridge=new GooglePlaySdkBridge(new android.app.Activity());view=new WebView();bridge.attach(view);bridge.resume();
  ConsentInformation consent=UserMessagingPlatform.info;require(consent.requests==1,"initial UMP request");
  consent.failure.accept(new FormError());Handler.flush();
  require(MobileAds.calls==0&&RewardedAd.loads==0,"UMP failure must not initialize or load ads");
  JavaScriptReplyProxy failed=tap();require(failed.messages.size()==1&&failed.messages.get(0).contains("consent-unavailable"),"failure immediately settles");
  require(!Toast.last.isEmpty(),"explicit visible feedback");require(consent.requests==1,"retry rate limited");
  Handler.advance(10_000);tap();require(consent.requests==2,"manual tap retries UMP");
  Runnable oldConsent=consent.success;Handler.advance(20_000);require(MobileAds.calls==0,"timeout is not consent");
  Handler.advance(10_000);bridge.pause();bridge.resume();require(consent.requests==3,"resume retries expired UMP");
  oldConsent.run();Handler.flush();require(UserMessagingPlatform.form==null,"late consent callback ignored");
  consent.success.run();MobileAds.fail=true;consent.allowed=true;UserMessagingPlatform.form.accept(null);Handler.flush();
  waitFor(()->android.util.Log.lines.stream().anyMatch(s->s.contains("initialization: java.lang.IllegalStateException")));require(RewardedAd.loads==0,"init failure doesn't load");
  Handler.advance(10_000);MobileAds.fail=false;tap();waitFor(()->MobileAds.callback!=null);
  MobileAds.callback.accept(new Object());Handler.flush();require(RewardedAd.loads==1,"SDK retry initializes and preloads");
  AdLoadCallback<RewardedAd> oldLoad=RewardedAd.callback;Handler.advance(20_000);
  require(RewardedAd.shows==0,"load timeout did not display ad");Handler.advance(10_000);tap();require(RewardedAd.loads==2,"manual load retry");
  oldLoad.onAdLoaded(new RewardedAd());Handler.flush();require(RewardedAd.shows==0,"stale inventory cannot show");
  RewardedAd.callback.onAdFailedToLoad(new LoadAdError());Handler.flush();require(android.util.Log.lines.stream().anyMatch(s->s.contains("NETWORK_ERROR")),"SDK error captured");
  Handler.advance(10_000);JavaScriptReplyProxy waiting=tap();require(waiting.messages.get(0).contains("loading"),"loading is immediately reported");
  RewardedAd ad=new RewardedAd();RewardedAd.callback.onAdLoaded(ad);Handler.flush();require(RewardedAd.shows==0,"no delayed surprise display after failed tap");
  bridge.pause();JavaScriptReplyProxy hidden=tap();require(hidden.messages.get(0).contains("busy")&&RewardedAd.shows==0,"background cannot show");bridge.resume();
  JavaScriptReplyProxy shown=tap();require(RewardedAd.shows==1&&shown.messages.isEmpty(),"new tap shows ready ad without premature reward");
  ad.event.onAdShowedFullScreenContent();ad.earned.accept(new Object());Handler.flush();require(shown.messages.isEmpty(),"earned alone does not finish before dismissal");
  ad.event.onAdDismissedFullScreenContent();Handler.flush();require(shown.messages.size()==1&&shown.messages.get(0).contains("\\\"rewarded\\\":true"),"shown earned dismissed produces one authoritative receipt");
  ad.earned.accept(new Object());ad.event.onAdDismissedFullScreenContent();Handler.advance(250);require(shown.messages.size()==1,"duplicate callbacks cannot double reward");
  bridge.destroy();System.out.println("{\\\"status\\\":\\\"PASS\\\",\\\"checks\\\":"+checks+",\\\"actualNativeBridge\\\":true,\\\"realDeviceOrAds\\\":false}");
 }
}''')

SRC.mkdir(parents=True, exist_ok=True)
CLASSES.mkdir(parents=True, exist_ok=True)
for relative, content in files.items():
    target = SRC / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')
production = ROOT / 'android-google-play/app/src/main/java/com/blockout/app'
java_files = [str(SRC / name) for name in files] + [str(production / name) for name in ['GooglePlaySdkBridge.java', 'GooglePlayAdPolicy.java', 'GooglePlayAdAttempt.java']]
compiled = subprocess.run([str(JDK / 'javac.exe'), '-encoding', 'UTF-8', '-d', str(CLASSES), *java_files], capture_output=True, text=True)
(OUT / 'compile.log').write_text(compiled.stdout + compiled.stderr, encoding='utf-8')
if compiled.returncode:
    raise RuntimeError(compiled.stderr)
result = subprocess.run([str(JDK / 'java.exe'), '-cp', str(CLASSES), 'com.blockout.app.RecoveryHarness'], capture_output=True, text=True)
(OUT / 'run.log').write_text(result.stdout + result.stderr, encoding='utf-8')
if result.returncode:
    raise RuntimeError(result.stderr)
report = json.loads(result.stdout.strip())
report['coverage'] = ['UMP failure and retry cooldown', 'UMP timeout does not grant permission',
    'resume retries UMP', 'late UMP callback ignored', 'initialization exception and manual recovery',
    'load timeout, stale callback and SDK error diagnostics', 'loading result with immediate feedback',
    'preload never shows a late reward ad', 'background display blocked',
    'shown + earned + dismissed receipt', 'duplicate callbacks do not grant twice']
report['sourceSha256'] = {str(Path(p).relative_to(ROOT)): hashlib.sha256(Path(p).read_bytes()).hexdigest()
    for p in [*java_files[-3:], __file__]}
(OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report))
