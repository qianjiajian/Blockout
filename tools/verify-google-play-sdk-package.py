"""Verify the isolated SDK test artifacts. Never starts the app or sends telemetry."""
import hashlib
import json
import pathlib
import re
import struct
import subprocess
import xml.etree.ElementTree as ET
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
WORK = ROOT / '.codex-temp/google-play-sdk-20261019'
OUT = ROOT / 'artifacts/google-play'
SDK = ROOT / '.codex-temp/android-toolchain/android-sdk/build-tools/36.0.0'
JDK = ROOT / '.codex-temp/android-toolchain/jdk-17/bin'
BUNDLETOOL = ROOT / '.codex-temp/android-toolchain/bundletool.jar'
APK = OUT / 'SlideJam-0.1.10-googleplay-sdk-test.apk'
AAB = OUT / 'SlideJam-0.1.10-googleplay-sdk-test.aab'
CERT = 'bfcd8592c9a73a9f02a9565e0ee71dcb2754dabaebd1ffcb256110bdfc8cebb9'
SHA_AAR = '70c881e8aee717143b935e4409e9025ea3d99c85ac7cd4b92a8975f9de639eba'
ANDROID = '{http://schemas.android.com/apk/res/android}'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def command(name, argv):
    proc = subprocess.run([str(a) for a in argv], cwd=ROOT, capture_output=True)
    output = (proc.stdout + proc.stderr).decode('utf-8', errors='replace')
    (WORK / (name + '.txt')).write_text(output, encoding='utf-8')
    assert proc.returncode == 0, f'{name} failed; see saved output'
    return output


def elf_load_alignment(data):
    assert data[:4] == b'\x7fELF', 'Native library is not ELF'
    endian = '<' if data[5] == 1 else '>'
    if data[4] == 2:
        offset = struct.unpack_from(endian + 'Q', data, 32)[0]
        size, count = struct.unpack_from(endian + 'HH', data, 54)
        alignment_offset, alignment_format = 48, 'Q'
    else:
        offset = struct.unpack_from(endian + 'I', data, 28)[0]
        size, count = struct.unpack_from(endian + 'HH', data, 42)
        alignment_offset, alignment_format = 28, 'I'
    return [struct.unpack_from(endian + alignment_format, data,
                               offset + i * size + alignment_offset)[0]
            for i in range(count)
            if struct.unpack_from(endian + 'I', data, offset + i * size)[0] == 1]


web = {p.relative_to(WORK / 'web').as_posix(): sha(p.read_bytes())
       for p in sorted((WORK / 'web').rglob('*')) if p.is_file()}
assert web, 'Missing tested web assets'
marker = json.loads((WORK / 'web/google-play-build.json').read_text(encoding='utf-8'))
assert marker['target'] == 'google-play'
assert marker['applicationId'] == 'com.SlideJam.SweetPotato'
assert marker['versionName'] == '0.1.10' and marker['versionCode'] == 11
assert marker['adsMode'] == 'official-test' and marker['adsEnabled'] is True
assert marker['analyticsEnabled'] is False and marker['submissionReady'] is False
assert marker['mediationWrapperIntegrated'] is False
assert not any('board-editor' in name or name.endswith('.map') for name in web)

packages = []
for package, prefix in [(APK, 'assets/'), (AAB, 'base/assets/')]:
    with zipfile.ZipFile(package) as archive:
        assert archive.testzip() is None
        assets = {n[len(prefix):]: sha(archive.read(n)) for n in archive.namelist()
                  if n.startswith(prefix) and not n.endswith('/')}
        # SDKs can add their own assets; every game asset must match byte for byte.
        assert all(assets.get(n) == digest for n, digest in web.items())
        native = []
        for name in archive.namelist():
            if not name.endswith('.so'):
                continue
            alignments = elf_load_alignment(archive.read(name))
            assert alignments and min(alignments) >= 16384, f'{name} lacks 16KB ELF alignment'
            native.append({'name': name, 'loadAlignments': alignments})
        if package == AAB:
            signed_text = archive.read('META-INF/MANIFEST.MF').decode('utf-8')
            signed_text = signed_text.replace('\r\n', '\n').replace('\n ', '')
            signed = set(re.findall(r'^Name: (.+)$', signed_text, re.M))
            payload = {n for n in archive.namelist() if not n.startswith('META-INF/') and not n.endswith('/')}
            assert payload <= signed, 'Unsigned AAB payload'
    packages.append({'file': package.name, 'bytes': package.stat().st_size,
                     'sha256': sha(package.read_bytes()), 'webAssetsMatch': True,
                     'gameAssetCount': len(web), 'sdkAssetCount': len(assets) - len(web),
                     'nativeLibraries': native})

signature = command('sdk-apk-signature', [SDK / 'apksigner.bat', 'verify', '--verbose', '--print-certs', APK])
assert CERT in signature.lower()
assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in signature
command('sdk-apk-zipalign', [SDK / 'zipalign.exe', '-c', '-P', '16', '4', APK])
command('sdk-apk-badging', [SDK / 'aapt2.exe', 'dump', 'badging', APK])
jarsigner = command('sdk-aab-signature', [JDK / 'jarsigner.exe', '-J-Duser.language=en',
                                       '-J-Duser.country=US', '-verify', '-verbose', '-certs', AAB])
assert 'jar verified.' in jarsigner
certificate = command('sdk-aab-certificate', [JDK / 'keytool.exe', '-J-Duser.language=en',
                                            '-J-Duser.country=US', '-printcert', '-jarfile', AAB])
assert CERT in certificate.lower().replace(':', '')
command('sdk-aab-validate', [JDK / 'java.exe', '-Dfile.encoding=UTF-8', '-jar', BUNDLETOOL,
                           'validate', '--bundle=' + str(AAB)])
manifest_text = command('sdk-aab-manifest', [JDK / 'java.exe', '-Dfile.encoding=UTF-8', '-jar', BUNDLETOOL,
                                          'dump', 'manifest', '--bundle=' + str(AAB), '--module=base'])
manifest = ET.fromstring(manifest_text)
assert manifest.attrib['package'] == 'com.SlideJam.SweetPotato'
assert manifest.attrib[ANDROID + 'versionCode'] == '11'
assert manifest.attrib[ANDROID + 'versionName'] == '0.1.10'
assert manifest.find('uses-sdk').attrib[ANDROID + 'minSdkVersion'] == '24'
assert manifest.find('uses-sdk').attrib[ANDROID + 'targetSdkVersion'] == '36'
app = manifest.find('application')
assert app.attrib.get(ANDROID + 'debuggable', 'false') == 'false'
assert app.attrib.get(ANDROID + 'testOnly', 'false') == 'false'
assert app.attrib.get(ANDROID + 'allowBackup') == 'false'
assert app.attrib.get(ANDROID + 'name') != 'com.hs.admob.MApplication'
providers = {p.attrib[ANDROID + 'name'] for p in app.findall('provider')}
assert 'com.reyun.solar.engine.lifecycle.SystemLifecycleContentProvider' not in providers
assert 'com.google.firebase.provider.FirebaseInitProvider' not in providers
launchers = []
for activity in app.findall('activity'):
    for intent in activity.findall('intent-filter'):
        if any(c.attrib.get(ANDROID + 'name') == 'android.intent.category.LAUNCHER'
               for c in intent.findall('category')):
            launchers.append(activity.attrib[ANDROID + 'name'])
assert launchers == ['com.blockout.app.MainActivity'], f'Unexpected launcher: {launchers}'
metadata = {m.attrib[ANDROID + 'name']: m.attrib.get(ANDROID + 'value') for m in app.findall('meta-data')}
assert metadata.get('firebase_analytics_collection_deactivated') == 'true'
permissions = [p.attrib[ANDROID + 'name'] for p in manifest.findall('uses-permission')]
assert 'android.permission.INTERNET' in permissions
assert not set(permissions) & {'android.permission.READ_PHONE_STATE', 'android.permission.ACCESS_FINE_LOCATION',
                              'android.permission.READ_BASIC_PHONE_STATE', 'android.permission.READ_CONTACTS',
                              'android.permission.QUERY_ALL_PACKAGES'}

aar = ROOT / 'android-google-play/app/libs/Sdk_Mediation_v0.0.3.aar'
assert sha(aar.read_bytes()) == SHA_AAR, 'Supplied AAR was modified'
before = json.loads((WORK / 'protected-before.json').read_text(encoding='utf-8'))
changed = [name for name, digest in before.items()
           if not (ROOT / name).is_file() or sha((ROOT / name).read_bytes()) != digest]
assert not changed, f'Protected source/channel files changed: {changed}'
lint = ET.parse(ROOT / 'android-google-play/app/build/reports/lint-results-release.xml').getroot()
issues = [dict(i.attrib) for i in lint.findall('issue')]
assert not any(i['severity'] in ['Error', 'Fatal'] for i in issues)
report = {'status': 'PASS', 'scope': 'Official test ads only; not ready for submission',
          'artifacts': packages, 'marker': marker, 'certificateSha256': CERT,
          'permissions': permissions, 'launchers': launchers, 'lint': issues,
          'protectedFileCount': len(before), 'protectedFilesChanged': changed,
          'originalMediationAarSha256': SHA_AAR,
          'limitations': ['No physical Android device or AVD verification.',
                         'No production ads requested or production analytics uploaded.',
                         'Supplied private mediation wrapper remains dormant pending vendor consent fixes.',
                         'Third-party mediation sources, privacy website, Play Console declarations remain pending.']}
(OUT / 'SlideJam-0.1.10-googleplay-sdk-test-checks.json').write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'status': 'PASS', 'artifacts': packages, 'protectedFileCount': len(before)}, indent=2))
