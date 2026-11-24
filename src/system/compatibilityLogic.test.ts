import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectBinaryType,
  diagnoseLaunchFailure,
  evaluateLowRamSafety,
  parseLddOutput,
} from './compatibilityLogic';

test('detectBinaryType classifies .exe, .msi, .deb, .AppImage, .apk cleanly', () => {
  assert.equal(detectBinaryType('/home/kemet/Downloads/setup.exe').format, 'exe');
  assert.equal(detectBinaryType('/home/kemet/Downloads/setup.exe').runtime, 'wine');

  assert.equal(detectBinaryType('installer.MSI').format, 'msi');
  assert.equal(detectBinaryType('installer.MSI').runtime, 'wine');

  assert.equal(detectBinaryType('chrome.deb').format, 'deb');
  assert.equal(detectBinaryType('chrome.deb').runtime, 'apt');

  assert.equal(detectBinaryType('Krita-5.2.AppImage').format, 'appimage');
  assert.equal(detectBinaryType('Krita-5.2.AppImage').runtime, 'native-linux');

  const apk = detectBinaryType('app-release.apk');
  assert.equal(apk.format, 'apk');
  assert.equal(apk.runtime, 'waydroid');
  assert.equal(apk.requiresKvm, true);
});

test('evaluateLowRamSafety blocks Android below 2GB total RAM and warns Wine on low free RAM', () => {
  const lowTotalAndroid = evaluateLowRamSafety(700, 1024, 'android');
  assert.equal(lowTotalAndroid.allowed, false);
  assert.equal(lowTotalAndroid.severity, 'blocked');
  assert.equal(lowTotalAndroid.isLowRamDevice, true);

  const lowFreeWine = evaluateLowRamSafety(320, 2048, 'wine');
  assert.equal(lowFreeWine.allowed, true);
  assert.equal(lowFreeWine.severity, 'warning');
  assert.equal(lowFreeWine.isLowRamDevice, true);

  const criticalWine = evaluateLowRamSafety(120, 1024, 'wine');
  assert.equal(criticalWine.allowed, false);
  assert.equal(criticalWine.severity, 'blocked');

  const healthyAndroid = evaluateLowRamSafety(2400, 8192, 'android');
  assert.equal(healthyAndroid.allowed, true);
  assert.equal(healthyAndroid.severity, 'safe');
  assert.equal(healthyAndroid.isLowRamDevice, false);
});

test('parseLddOutput identifies resolved and missing shared libraries', () => {
  const sample = `
    linux-vdso.so.1 (0x00007ffc)
    libtinfo.so.6 => /lib/x86_64-linux-gnu/libtinfo.so.6 (0x00007f12)
    libGL.so.1 => not found
    /lib64/ld-linux-x86-64.so.2 (0x00007f99)
  `;
  const parsed = parseLddOutput(sample);
  assert.equal(parsed.length, 4);
  assert.equal(parsed[1].name, 'libtinfo.so.6');
  assert.equal(parsed[1].isMissing, false);
  assert.equal(parsed[2].name, 'libGL.so.1');
  assert.equal(parsed[2].isMissing, true);
  assert.equal(parsed[2].resolvedPath, null);
});

test('diagnoseLaunchFailure surfaces actionable human-readable causes', () => {
  const i386 = diagnoseLaunchFailure('Missing wine32 i386 library', { ext: '.exe' });
  assert.equal(i386.code, 'missing-i386');
  assert.ok(i386.fixCommand?.includes('i386'));

  const kvm = diagnoseLaunchFailure('Waydroid /dev/kvm missing', { ext: '.apk' });
  assert.equal(kvm.code, 'missing-kvm-waydroid');
});
