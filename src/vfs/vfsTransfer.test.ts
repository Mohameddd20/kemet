import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultVfsTree, writeFile } from './treeOps';
import {
  calculateVfsStats,
  parseAndValidateVfsBackup,
  serializeVfsBackup,
} from './vfsTransfer';

test('calculateVfsStats accurately counts files, folders, and byte usage', () => {
  const tree = createDefaultVfsTree();
  const stats = calculateVfsStats(tree);
  assert.equal(stats.totalFolders, 5); // home, user, Documents, Notes, Projects
  assert.equal(stats.totalFiles, 5);
  assert.ok(stats.contentBytes > 100);
  assert.ok(stats.serializedBytes > stats.contentBytes);
  assert.ok(stats.largestFiles.length > 0);
});

test('serializeVfsBackup and parseAndValidateVfsBackup round-trip cleanly and reject invalid backups', () => {
  const seeded = createDefaultVfsTree();
  const modified = writeFile(seeded, '/home/user/Notes', 'backup-test.txt', 'persisted backup').tree;

  const json = serializeVfsBackup(modified);
  const parsed = parseAndValidateVfsBackup(json);
  assert.equal(parsed.ok, true);
  assert.ok(parsed.tree);

  const stats = calculateVfsStats(parsed.tree!);
  assert.equal(stats.totalFiles, 6);

  assert.equal(parseAndValidateVfsBackup('{bad json').ok, false);
  assert.equal(parseAndValidateVfsBackup('{"type":"file","id":"x"}').ok, false);
});
