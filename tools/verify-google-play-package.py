"""Validate offline Google Play deliverables without loading player saves."""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import xml.etree.ElementTree as ET
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--version', default='0.1.9')
parser.add_argument('--version-code', type=int, default=10)
parser.add_argument('--application-id', default='com.SlideJam.SweetPotato')
parser.add_argument('--work', default='.codex-temp/google-play-0.1.9-20261019')
args = parser.parse_args()
WORK = ROOT / args.work
OUT = ROOT / 'artifacts/google-play'
SDK = ROOT / '.codex-temp/android-toolchain/android-sdk/build-tools/36.0.0'
JDK = ROOT / '.codex-temp/android-toolchain/jdk-17/bin'
BUNDLETOOL = ROOT / '.codex-temp/android-toolchain/bundletool.jar'
EXPECTED_CERT = 'bfcd8592c9a73a9f02a9565e0ee71dcb2754dabaebd1ffcb256110bdfc8cebb9'
APK = OUT / f'BlockOut-{args.version}-googleplay-release.apk'
AAB = OUT / f'BlockOut-{args.version}-googleplay-release.aab'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def command(name, args):
    result = subprocess.run([str(a) for a in args], cwd=ROOT, capture_output=True)
    output = (result.stdout + result.stderr).decode('utf-8', errors='replace')
    (WORK / (name + '.txt')).write_text(output, encoding='utf-8')
    if result.returncode:
        raise RuntimeError(f'{name} failed ({result.returncode}); see saved log')
    return output


web = {p.relative_to(WORK / 'web').as_posix(): sha(p.read_bytes())
       for p in sorted((WORK / 'web').rglob('*')) if p.is_file()}
assert web, 'Missing dedicated Web assets'
marker = json.loads((WORK / 'web/google-play-build.json').read_text(encoding='utf-8'))
assert marker['target'] == 'google-play'
assert marker['versionCode'] == args.version_code and marker['versionName'] == args.version
assert marker.get('applicationId', 'com.blockout.app') == args.application_id
assert marker['adsEnabled'] is False and marker['submissionReady'] is False
assert not any('board-editor' in p or p.endswith('.map') for p in web)

artifacts = []
for package, prefix in [(APK, 'assets/'), (AAB, 'base/assets/')]:
    with zipfile.ZipFile(package) as archive:
        assert archive.testzip() is None
        assets = {n[len(prefix):]: sha(archive.read(n)) for n in archive.namelist()
                  if n.startswith(prefix) and not n.endswith('/')}
        assert assets == web, f'{package.name}: packaged assets differ from tested Web build'
        native = [n for n in archive.namelist() if n.endswith('.so')]
        assert not native, 'Offline build unexpectedly contains native SDK libraries'
        if package == AAB:
            manifest = archive.read('META-INF/MANIFEST.MF').decode('utf-8').replace('\r\n', '\n')
            manifest = manifest.replace('\n ', '')
            signed = set(re.findall(r'^Name: (.+)$', manifest, flags=re.M))
            required = {n for n in archive.namelist() if not n.startswith('META-INF/') and not n.endswith('/')}
            assert required <= signed, 'Unsigned AAB payload entries'
    artifacts.append({'file': package.name, 'bytes': package.stat().st_size,
                      'sha256': sha(package.read_bytes()), 'webAssetCount': len(assets),
                      'assetsMatch': True, 'nativeLibraries': native})

signature = command('apk-signature', [SDK / 'apksigner.bat', 'verify', '--verbose', '--print-certs', APK])
assert EXPECTED_CERT in signature.lower(), 'APK certificate changed'
assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in signature
command('apk-zipalign', [SDK / 'zipalign.exe', '-c', '-P', '16', '4', APK])
badging = command('apk-badging', [SDK / 'aapt2.exe', 'dump', 'badging', APK])
for token in [f"name='{args.application_id}'", f"versionCode='{args.version_code}'", f"versionName='{args.version}'",
              "minSdkVersion:'24'", "targetSdkVersion:'36'", 'launchable-activity:']:
    assert token in badging, f'Missing APK property: {token}'
assert 'application-debuggable' not in badging
assert 'uses-permission' not in badging
command('apk-manifest', [SDK / 'aapt2.exe', 'dump', 'xmltree', APK, '--file', 'AndroidManifest.xml'])

jarsigner = command('aab-signature', [JDK / 'jarsigner.exe', '-J-Duser.language=en', '-J-Duser.country=US',
                                    '-verify', '-verbose', '-certs', AAB])
assert 'jar verified.' in jarsigner, 'AAB JAR signature not verified'
certificate = command('aab-certificate', [JDK / 'keytool.exe', '-J-Duser.language=en', '-J-Duser.country=US',
                                         '-printcert', '-jarfile', AAB])
assert EXPECTED_CERT in certificate.lower().replace(':', ''), 'AAB certificate differs from APK'
command('aab-validation', [JDK / 'java.exe', '-Dfile.encoding=UTF-8', '-jar', BUNDLETOOL, 'validate', '--bundle=' + str(AAB)])
manifest_xml = command('aab-manifest', [JDK / 'java.exe', '-Dfile.encoding=UTF-8', '-jar', BUNDLETOOL, 'dump', 'manifest',
                                      '--bundle=' + str(AAB), '--module=base'])
manifest = ET.fromstring(manifest_xml)
android = '{http://schemas.android.com/apk/res/android}'
assert manifest.attrib['package'] == args.application_id
assert manifest.attrib[android + 'versionCode'] == str(args.version_code)
assert manifest.attrib[android + 'versionName'] == args.version
uses_sdk = manifest.find('uses-sdk')
assert uses_sdk.attrib[android + 'minSdkVersion'] == '24'
assert uses_sdk.attrib[android + 'targetSdkVersion'] == '36'
assert manifest.find('uses-permission') is None
app = manifest.find('application')
assert app.attrib.get(android + 'debuggable', 'false') == 'false'
assert app.attrib.get(android + 'testOnly', 'false') == 'false'
assert app.attrib.get(android + 'allowBackup') == 'false'
assert app.attrib.get(android + 'appCategory') in ['game', '0']
assert android + 'dataExtractionRules' in app.attrib
assert app.attrib.get(android + 'enableOnBackInvokedCallback') == 'false'
activity = app.find('activity')
assert activity.attrib[android + 'name'] == 'com.blockout.app.MainActivity'
assert activity.attrib[android + 'exported'] == 'true'
assert activity.find("intent-filter/action").attrib[android + 'name'] == 'android.intent.action.MAIN'
assert activity.find("intent-filter/category").attrib[android + 'name'] == 'android.intent.category.LAUNCHER'

# This derived APK is an internal packaging check only. Bundletool's local
# Debug key is deliberately not used for the delivered Release APK or AAB.
command('derived-apk-build', [JDK / 'java.exe', '-Dfile.encoding=UTF-8', '-jar', BUNDLETOOL,
                             'build-apks', '--bundle=' + str(AAB), '--mode=universal',
                             '--aapt2=' + str(SDK / 'aapt2.exe'),
                             '--output=' + str(WORK / 'derived-test.apks'), '--overwrite'])
derived = WORK / 'derived-test-universal.apk'
with zipfile.ZipFile(WORK / 'derived-test.apks') as archive:
    derived.write_bytes(archive.read('universal.apk'))
with zipfile.ZipFile(derived) as archive:
    assert archive.testzip() is None
    assert {n[7:]: sha(archive.read(n)) for n in archive.namelist()
            if n.startswith('assets/') and not n.endswith('/')} == web
    assert not any(n.endswith('.so') for n in archive.namelist())
derived_signature = command('derived-apk-signature', [SDK / 'apksigner.bat', 'verify', '--verbose', '--print-certs', derived])
assert EXPECTED_CERT not in derived_signature.lower(), 'Derived internal APK unexpectedly uses release signing'
command('derived-apk-zipalign', [SDK / 'zipalign.exe', '-c', '-P', '16', '4', derived])

before = json.loads((WORK / 'other-channels-before.json').read_text(encoding='utf-8'))
changed = [name for name, digest in before.items()
           if not (ROOT / name).is_file() or sha((ROOT / name).read_bytes()) != digest]
assert not changed, f'Protected shared/channel files changed: {changed}'
lint = ET.parse(ROOT / 'android-google-play/app/build/reports/lint-results-release.xml').getroot()
lint_issues = [{'id': i.attrib['id'], 'severity': i.attrib['severity'], 'message': i.attrib['message']}
               for i in lint.findall('issue')]
assert not any(i['severity'] in ['Error', 'Fatal'] for i in lint_issues), 'Android lint errors'
report = {
    'status': 'PASS', 'scope': 'Offline Google Play base test build; not ready for store submission',
    'marker': marker, 'artifacts': artifacts, 'certificateSha256': EXPECTED_CERT,
    'protectedFileCount': len(before), 'protectedFilesChanged': changed,
    'lint': lint_issues, 'apkV2Signature': True, 'apkZipAlignment': True,
    'aabJarSignature': True, 'aabAllPayloadEntriesSigned': True, 'bundletoolValidate': True,
    'bundletoolSha256': sha(BUNDLETOOL.read_bytes()),
    'derivedApk': {'status': 'PASS', 'assetsMatch': True, 'zipAlignment': True, 'nativeLibraries': [],
                   'signing': 'Local Debug certificate; internal packaging validation only; not delivered'},
    'limitations': ['No connected physical device or AVD; no OEM or native window runtime certification.',
                    'No ads/analytics SDK, live credentials, operator/contact or public privacy URL supplied.',
                    'Play Console setup, declarations, pre-launch report and store submission remain pending.'],
}
(OUT / f'BlockOut-{args.version}-googleplay-package-checks.json').write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'status': 'PASS', 'artifacts': artifacts, 'protectedFileCount': len(before),
                  'lintWarnings': len(lint_issues)}, ensure_ascii=False, indent=2))
