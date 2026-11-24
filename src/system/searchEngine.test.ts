import assert from 'node:assert/strict';
import test from 'node:test';
import { searchSystemEverything } from './searchEngine.ts';

const SAMPLE_APPS = [
  { id: 'terminal' as const, title: 'Terminal', arabicTitle: 'الطرفية', description: 'Interactive bash shell' },
  { id: 'calculator' as const, title: 'Calculator', arabicTitle: 'الآلة الحاسبة', description: 'Math and unit tools' },
  { id: 'settings' as const, title: 'Settings', arabicTitle: 'الإعدادات', description: 'System preferences' },
];

const SAMPLE_FILES = [
  { name: 'welcome.md', path: '/home/user/Documents/welcome.md' },
  { name: 'budget.txt', path: '/home/user/Documents/budget.txt' },
];

const SAMPLE_WEB_APPS = [
  { id: 'web-1', name: 'Wikipedia', url: 'https://en.m.wikipedia.org' },
];

test('searchSystemEverything ranks exact and prefix app matches highest', () => {
  const results = searchSystemEverything('term', SAMPLE_APPS, SAMPLE_FILES, SAMPLE_WEB_APPS);
  assert.equal(results[0]?.id, 'app-terminal');
});

test('searchSystemEverything evaluates safe arithmetic queries inline', () => {
  const results = searchSystemEverything('25 * 4 + 2', SAMPLE_APPS, SAMPLE_FILES, SAMPLE_WEB_APPS);
  assert.equal(results[0]?.kind, 'math');
  assert.equal(results[0]?.title, '= 102');
});

test('searchSystemEverything matches Arabic app names and VFS files', () => {
  const arResults = searchSystemEverything('الطرفية', SAMPLE_APPS, SAMPLE_FILES, SAMPLE_WEB_APPS);
  assert.ok(arResults.some((r) => r.appId === 'terminal'));

  const fileResults = searchSystemEverything('budget', SAMPLE_APPS, SAMPLE_FILES, SAMPLE_WEB_APPS);
  assert.ok(fileResults.some((r) => r.kind === 'file' && r.filePath === '/home/user/Documents/budget.txt'));
});
