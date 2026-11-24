import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveTabTitle, QUICK_LAUNCH_SITES, resolveBrowserInput } from './browserUtils.ts';

test('resolveBrowserInput resolves domains, nizamos paths, and web search queries cleanly', () => {
  assert.equal(resolveBrowserInput('example.com'), 'https://example.com');
  assert.equal(resolveBrowserInput('https://github.com/explore'), 'https://github.com/explore');
  assert.equal(resolveBrowserInput('/home/user/notes.txt'), 'nizamos://home/user/notes.txt');
  assert.equal(
    resolveBrowserInput('linux kernel architecture'),
    'https://html.duckduckgo.com/html/?q=linux%20kernel%20architecture'
  );
  assert.ok(QUICK_LAUNCH_SITES.some((s) => s.label === 'Google'));
  assert.ok(QUICK_LAUNCH_SITES.some((s) => s.label === 'YouTube'));
  assert.ok(QUICK_LAUNCH_SITES.some((s) => s.label === 'GitHub'));
  assert.ok(QUICK_LAUNCH_SITES.some((s) => s.label === 'ChatGPT'));
});

test('deriveTabTitle formats hostnames, q/search queries, and internal paths', () => {
  assert.equal(deriveTabTitle('nizamos://home/user/Documents/welcome.md'), 'welcome.md');
  assert.equal(deriveTabTitle('https://www.example.com/docs'), 'example.com');
  assert.equal(
    deriveTabTitle('https://html.duckduckgo.com/html/?q=react'),
    'Search: react'
  );
  assert.equal(
    deriveTabTitle('https://en.m.wikipedia.org/w/index.php?search=react'),
    'Search: react'
  );
});
