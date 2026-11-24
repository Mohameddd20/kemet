import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDriverInventory,
  computeCpuDelta,
  computeSha256Hex,
  parseAsoundCards,
  parseDfOutput,
  parseLspciDrivers,
  parseLsusbDevices,
  parseNmcliWifiOutput,
  parseOsRelease,
  parseProcCpuInfo,
  parseProcMemInfo,
  parseProcNetDev,
  parseProcStat,
  parsePsOutput,
  parseUpowerBattery,
  parseAcpiBattery,
  injectBaseAndStripFrameMeta,
  resolveBrowseTargetUrl,
  resolveSafeHostPath,
  rewriteCssUrlsForProxy,
  rewriteHtmlForProxy,
  validateProxyUrl,
} from './systemParsers';
import {
  parseAptUpgradableOutput,
  verifyManifestSha256Digest,
} from '../system/updateManifest';

test('parseProcStat and computeCpuDelta calculate CPU utilization accurately', () => {
  const snap1 = parseProcStat(
    'cpu  1000 0 200 8800 0 0 0 0 0 0\ncpu0 500 0 100 4400 0 0 0 0 0 0\ncpu1 500 0 100 4400 0 0 0 0 0 0\n'
  );
  const snap2 = parseProcStat(
    'cpu  1250 0 250 9500 0 0 0 0 0 0\ncpu0 650 0 150 4700 0 0 0 0 0 0\ncpu1 600 0 100 4800 0 0 0 0 0 0\n'
  );
  const delta = computeCpuDelta(snap1, snap2);
  // total delta: 11000 - 10000 = 1000; idle delta: 9500 - 8800 = 700 -> 30%
  assert.equal(delta.totalPercent, 30);
  assert.equal(delta.corePercents.length, 2);
  assert.equal(delta.corePercents[0], 40);
  assert.equal(delta.corePercents[1], 20);
});

test('parseProcMemInfo extracts total, available, and used MB', () => {
  const mem = parseProcMemInfo(
    'MemTotal:       12582912 kB\nMemFree:        10000000 kB\nMemAvailable:   11534336 kB\nBuffers:          102400 kB\nCached:           524288 kB\n'
  );
  assert.equal(mem.totalMb, 12288);
  assert.equal(mem.availableMb, 11264);
  assert.equal(mem.usedMb, 1024);
  assert.equal(mem.cachedMb, 512);
  assert.ok(mem.usedPercent > 8 && mem.usedPercent < 9);
});

test('parseProcNetDev sums non-loopback interfaces', () => {
  const raw = [
    'Inter-|   Receive | Transmit',
    ' face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets',
    '    lo: 1000 10 0 0 0 0 0 0 1000 10 0 0 0 0 0 0',
    '  eth1: 2000 20 0 0 0 0 0 0 500 5 0 0 0 0 0 0',
    '  eth2: 3000 30 0 0 0 0 0 0 1500 15 0 0 0 0 0 0',
  ].join('\n');
  const net = parseProcNetDev(raw);
  assert.equal(net.rxBytes, 5000);
  assert.equal(net.txBytes, 2000);
  assert.equal(net.interfaces.length, 2);
});

test('parsePsOutput parses real ps rows cleanly', () => {
  const raw = [
    '  PID  PPID COMMAND         %CPU %MEM   RSS STAT',
    ' 2813  2800 node             1.4  0.6 79876 Sl',
    '    5     1 nginx            0.2  0.1 10876 S',
  ].join('\n');
  const rows = parsePsOutput(raw);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].pid, 2813);
  assert.equal(rows[0].name, 'node');
  assert.equal(rows[0].cpuPercent, 1.4);
  assert.equal(rows[0].memoryMb, 78);
});

test('parseNmcliWifiOutput deduplicates and sorts SSIDs', () => {
  const raw = [
    ' :CafeGuest:52:WPA2',
    '*:Studio5G:88:WPA2',
    ' :CafeGuest:40:WPA2',
  ].join('\n');
  const list = parseNmcliWifiOutput(raw);
  assert.equal(list.length, 2);
  assert.equal(list[0].ssid, 'Studio5G');
  assert.equal(list[0].inUse, true);
});

test('resolveSafeHostPath prevents escaping allowed roots', () => {
  const roots = ['/home/user', '/app/applet'];
  assert.equal(resolveSafeHostPath('/app/applet/src/App.tsx', roots), '/app/applet/src/App.tsx');
  assert.equal(resolveSafeHostPath('/app/applet/../etc/passwd', roots), null);
  assert.equal(resolveSafeHostPath('/etc/shadow', roots), null);
});

test('validateProxyUrl allows public HTTPS and blocks private/loopback hosts', () => {
  const ok = validateProxyUrl('https://example.com/docs');
  assert.equal(ok.ok, true);
  assert.equal(validateProxyUrl('http://127.0.0.1:3000').ok, false);
  assert.equal(validateProxyUrl('http://169.254.169.254/latest').ok, false);
  assert.equal(validateProxyUrl('file:///etc/passwd').ok, false);
});

test('rewriteHtmlForProxy rewrites relative URLs, CSS url(), strips base/CSP/integrity, and unwraps DuckDuckGo uddg redirects', () => {
  const out = rewriteHtmlForProxy(
    '<html><head><base href="https://html.duckduckgo.com/html/"><meta http-equiv="X-Frame-Options" content="DENY"><link rel="stylesheet" href="/assets/app.css" integrity="sha384-abc" crossorigin="anonymous"><style>.hero{background:url(/img/bg.png)}</style></head><body><a href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fdocs">Result</a><img src="logo.png"/></body></html>',
    'https://html.duckduckgo.com/html/'
  );
  assert.ok(out.includes('<base target="_self" />'));
  assert.equal(out.includes('<base href="https://html.duckduckgo.com'), false);
  assert.equal(/x-frame-options/i.test(out), false);
  assert.equal(/integrity=/i.test(out), false);
  assert.ok(out.includes('/api/browser/proxy?url=https%3A%2F%2Fhtml.duckduckgo.com%2Fassets%2Fapp.css'));
  assert.ok(out.includes('/api/browser/proxy?url=https%3A%2F%2Fhtml.duckduckgo.com%2Fimg%2Fbg.png'));
  assert.ok(out.includes('/api/browser/proxy?url=https%3A%2F%2Fexample.com%2Fdocs'));
  assert.ok(out.includes('/api/browser/proxy?url=https%3A%2F%2Fhtml.duckduckgo.com%2Fhtml%2Flogo.png'));

  const cssOut = rewriteCssUrlsForProxy('body { background: url("../fonts/bg.png"); }', 'https://example.com/styles/main.css');
  assert.ok(cssOut.includes('/api/browser/proxy?url=https%3A%2F%2Fexample.com%2Ffonts%2Fbg.png'));
});

test('parseDfOutput extracts real disk partitions and filters tmpfs pseudo-mounts', () => {
  const raw = [
    'Filesystem     Type     1B-blocks        Used   Available Capacity Mounted on',
    '/dev/nvme0n1p2 ext4  250000000000 110000000000 140000000000      44% /',
    'tmpfs          tmpfs   8000000000      1000000   7999000000       1% /dev/shm',
    '/dev/sda1      ext4  500000000000 475000000000  25000000000      95% /mnt/games',
  ].join('\n');
  const disks = parseDfOutput(raw);
  assert.equal(disks.length, 2);
  assert.equal(disks[0].mountPoint, '/');
  assert.equal(disks[0].label, 'Local Disk (/)');
  assert.equal(disks[0].usedPercent, 44);
  assert.equal(disks[1].mountPoint, '/mnt/games');
  assert.equal(disks[1].usedPercent, 95);
});

test('parseUpowerBattery and parseAcpiBattery parse real Linux battery output', () => {
  const up = parseUpowerBattery('  state: discharging\n  percentage: 78%\n  time to empty: 3.4 hours\n');
  assert.deepEqual(up, { percentage: 78, charging: false, timeRemaining: '3.4 hours' });

  const ac = parseAcpiBattery('Battery 0: Charging, 92%, 00:24:10 until charged');
  assert.deepEqual(ac, { percentage: 92, charging: true, timeRemaining: '00:24:10 until charged' });
});

test('parseProcCpuInfo, parseLspciDrivers, and parseOsRelease extract real Linux hardware specs', () => {
  const cpu = parseProcCpuInfo(
    'processor\t: 0\nvendor_id\t: AuthenticAMD\nmodel name\t: AMD Ryzen 7 5800H\nprocessor\t: 1\nmodel name\t: AMD Ryzen 7 5800H\n'
  );
  assert.equal(cpu.modelName, 'AMD Ryzen 7 5800H');
  assert.equal(cpu.cores, 2);
  assert.equal(cpu.vendor, 'AuthenticAMD');

  const pci = parseLspciDrivers(
    '03:00.0 VGA compatible controller: Advanced Micro Devices, Inc. [AMD/ATI] Cezanne\n\tKernel driver in use: amdgpu\n04:00.0 Network controller: Intel Corporation Wi-Fi 6 AX200\n\tKernel driver in use: iwlwifi\n'
  );
  assert.equal(pci.length, 2);
  assert.equal(pci[0].category, 'gpu');
  assert.equal(pci[0].kernelDriver, 'amdgpu');
  assert.equal(pci[1].category, 'wifi');
  assert.equal(pci[1].kernelDriver, 'iwlwifi');

  const osRel = parseOsRelease('NAME="KemetOS"\nPRETTY_NAME="KemetOS 1.0 (Debian Bookworm)"\nID=kemetos\nVERSION_ID="1.0"\n');
  assert.equal(osRel.id, 'kemetos');
  assert.equal(osRel.prettyName, 'KemetOS 1.0 (Debian Bookworm)');
});

test('parseLsusbDevices, parseAsoundCards, and buildDriverInventory classify all 6 hardware groups', () => {
  const usb = parseLsusbDevices(
    'Bus 001 Device 002: ID 8087:0026 Intel Corp. AX201 Bluetooth\nBus 001 Device 003: ID 046d:0825 Logitech, Inc. Webcam C270\n'
  );
  assert.equal(usb.length, 2);
  assert.equal(usb[0].vendorProductId, '8087:0026');
  assert.equal(usb[1].name, 'Logitech, Inc. Webcam C270');

  const cards = parseAsoundCards(
    ' 0 [PCH            ]: HDA-Intel - HDA Intel PCH\n 1 [NVidia         ]: HDA-Intel - HDA NVidia\n'
  );
  assert.equal(cards.length, 2);
  assert.equal(cards[0].driver, 'HDA-Intel');
  assert.equal(cards[0].label, 'HDA Intel PCH');

  const inventory = buildDriverInventory({
    cpu: { modelName: 'Intel Core i3-3217U', cores: 4, vendor: 'GenuineIntel' },
    pciDrivers: [
      {
        slot: '00:02.0',
        deviceClass: 'VGA compatible controller',
        deviceName: 'Intel IvyBridge Graphics',
        kernelDriver: 'i915',
        category: 'gpu',
      },
      {
        slot: '02:00.0',
        deviceClass: 'Network controller',
        deviceName: 'Realtek RTL8821CE',
        kernelDriver: 'rtw88_8821ce',
        category: 'wifi',
      },
    ],
    usbDevices: usb,
    audioCards: cards,
    videoDevices: ['/dev/video0'],
  });

  const groups = new Set(inventory.map((d) => d.group));
  assert.deepEqual([...groups].sort(), ['audio', 'camera', 'cpu', 'gpu', 'network', 'usb']);
  assert.equal(inventory.find((d) => d.group === 'cpu')?.kernelModule, 'intel_pstate');
  assert.equal(inventory.find((d) => d.group === 'gpu')?.kernelModule, 'i915');
  assert.equal(inventory.find((d) => d.group === 'camera')?.kernelModule, 'uvcvideo');
});

test('parseAptUpgradableOutput and verifyManifestSha256Digest parse and verify updates', () => {
  const aptRaw = [
    'Listing... Done',
    'linux-image-amd64/bookworm-security 6.1.115-1 amd64 [upgradable from: 6.1.99-1]',
    'openssl/bookworm-security 3.0.15-1~deb12u1 amd64 [upgradable from: 3.0.13-1]',
    'firefox-esr/bookworm-proposed-updates 128.4.0esr-1 amd64 [upgradable from: 115.12.0esr-1]',
    'vlc/bookworm 3.0.21-1 amd64 [upgradable from: 3.0.20-1]',
  ].join('\n');

  const updates = parseAptUpgradableOutput(aptRaw);
  assert.equal(updates.length, 4);
  assert.equal(updates[0].category, 'kernel');
  assert.equal(updates[1].category, 'security');
  assert.equal(updates[2].category, 'security');
  assert.equal(updates[3].category, 'apps');

  const payload = JSON.stringify({ version: '1.0', updates: updates.map((u) => u.packageName) });
  const digest = computeSha256Hex(payload);
  assert.equal(verifyManifestSha256Digest(digest, digest).valid, true);
  assert.equal(verifyManifestSha256Digest(digest, '0'.repeat(64)).valid, false);
  assert.equal(verifyManifestSha256Digest('not-a-hash', digest).valid, false);
});

test('resolveBrowseTargetUrl routes search queries to DuckDuckGo HTML and preserves URLs', () => {
  assert.equal(
    resolveBrowseTargetUrl('تحميل جوجل كروم'),
    'https://html.duckduckgo.com/html/?q=%D8%AA%D8%AD%D9%85%D9%8A%D9%84%20%D8%AC%D9%88%D8%AC%D9%84%20%D9%83%D8%B1%D9%88%D9%85'
  );
  assert.equal(resolveBrowseTargetUrl('example.com'), 'https://example.com');
  assert.equal(resolveBrowseTargetUrl('https://www.google.com/'), 'https://www.google.com/');
});

test('injectBaseAndStripFrameMeta injects base tag and removes CSP/X-Frame-Options meta tags', () => {
  const html =
    '<html><head><meta http-equiv="X-Frame-Options" content="DENY"><meta http-equiv="Content-Security-Policy" content="frame-ancestors \'none\'"><title>Test</title></head><body><h1>Hi</h1></body></html>';
  const out = injectBaseAndStripFrameMeta(html, 'https://example.com/page');
  assert.ok(out.includes('<base href="https://example.com/page" target="_self" />'));
  assert.equal(/x-frame-options/i.test(out), false);
  assert.equal(/content-security-policy/i.test(out), false);
});



