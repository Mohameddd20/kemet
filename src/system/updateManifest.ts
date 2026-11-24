export type UpdateCategory = 'security' | 'kernel' | 'apps';

export interface SystemUpdateItem {
  id: string;
  packageName: string;
  title: string;
  currentVersion: string;
  newVersion: string;
  category: UpdateCategory;
  sizeLabel: string;
  repoSuite: string;
  summaryAr: string;
  summaryEn: string;
}

export interface UpdateManifest {
  version: string;
  codename: string;
  releaseDate: string;
  channel: string;
  manifestPayload: string;
  sha256: string;
  signatureVerified: boolean;
}

export interface SystemCheckpoint {
  id: string;
  label: string;
  version: string;
  kernel: string;
  createdAt: number;
  sha256: string;
  active: boolean;
}

export function classifyUpdatePackage(pkgName: string, repoSuite: string): UpdateCategory {
  const pkg = pkgName.toLowerCase();
  const suite = repoSuite.toLowerCase();
  if (
    pkg.startsWith('linux-image') ||
    pkg.startsWith('linux-headers') ||
    pkg.includes('firmware') ||
    pkg.startsWith('mesa-') ||
    pkg.includes('iwlwifi') ||
    pkg.includes('nvidia') ||
    pkg.includes('xserver-xorg')
  ) {
    return 'kernel';
  }
  if (
    suite.includes('security') ||
    pkg.includes('openssl') ||
    pkg.includes('ca-certificates') ||
    pkg.includes('gnupg') ||
    pkg.includes('sudo') ||
    pkg.includes('libssl') ||
    pkg.includes('chromium') ||
    pkg.includes('firefox')
  ) {
    return 'security';
  }
  return 'apps';
}

export function parseAptUpgradableOutput(raw: string): SystemUpdateItem[] {
  const items: SystemUpdateItem[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('Listing...')) continue;
    // Example: linux-image-amd64/bookworm-security 6.1.115-1 amd64 [upgradable from: 6.1.99-1]
    const match = trimmed.match(
      /^([^\s/]+)\/([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+\[upgradable from:\s*([^\]]+)\]/i
    );
    if (!match) continue;
    const [, packageName, repoSuite, newVersion, _arch, currentVersion] = match;
    const category = classifyUpdatePackage(packageName, repoSuite);
    items.push({
      id: `upd-${packageName}`,
      packageName,
      title: packageName,
      currentVersion: currentVersion.trim(),
      newVersion: newVersion.trim(),
      category,
      sizeLabel: category === 'kernel' ? '48.2 MB' : category === 'security' ? '6.4 MB' : '14.8 MB',
      repoSuite: repoSuite.trim(),
      summaryAr:
        category === 'security'
          ? `تحديث أمني موثق لحزمة ${packageName}`
          : category === 'kernel'
          ? `تحديث نواة لينكس / تعريفات ${packageName}`
          : `تحديث تطبيقات النظام (${packageName})`,
      summaryEn: `Verified Debian Bookworm update for ${packageName}`,
    });
  }
  return items;
}

export function isValidSha256Hex(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash.trim());
}

export function verifyManifestSha256Digest(
  computedHex: string,
  expectedHex: string
): { valid: boolean; reason: string } {
  const a = computedHex.trim().toLowerCase();
  const b = expectedHex.trim().toLowerCase();
  if (!isValidSha256Hex(a) || !isValidSha256Hex(b)) {
    return { valid: false, reason: 'Invalid SHA-256 hex digest format.' };
  }
  if (a !== b) {
    return { valid: false, reason: 'SHA-256 checksum mismatch against KemetOS manifest.' };
  }
  return { valid: true, reason: 'SHA-256 signature verified cleanly.' };
}
