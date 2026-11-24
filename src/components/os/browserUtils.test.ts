import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeDisplayUrl,
  isSelfKemetUrl,
  resolveOmniboxInput,
} from './browserUtils';

test('isSelfKemetUrl blocks localhost, 127.0.0.1, and relative paths', () => {
  assert.equal(isSelfKemetUrl('http://localhost:3000'), true);
  assert.equal(isSelfKemetUrl('http://127.0.0.1:3000/?autostart=1'), true);
  assert.equal(isSelfKemetUrl('/api/auth'), true);
  assert.equal(isSelfKemetUrl('https://github.com'), false);
});

test('resolveOmniboxInput handles Arabic search queries cleanly without percent-encoding', () => {
  const res = resolveOmniboxInput('تحميل برامج لينكس');
  assert.equal(res.mode, 'search');
  if (res.mode === 'search') {
    assert.equal(res.query, 'تحميل برامج لينكس');
    assert.equal(res.displayUrl, 'kemet://search?q=تحميل برامج لينكس');
  }
});

test('resolveOmniboxInput prevents loading localhost inside Kemet Browser', () => {
  const res = resolveOmniboxInput('http://localhost:3000');
  assert.equal(res.mode, 'newtab');
});

test('decodeDisplayUrl decodes Arabic URL characters cleanly', () => {
  assert.equal(
    decodeDisplayUrl('https://duckduckgo.com/?q=%D8%AA%D8%AD%D9%85%D9%8A%D9%84'),
    'https://duckduckgo.com/?q=تحميل'
  );
});

test('resolveOmniboxInput keeps "تحميل جوجل كروم" in search mode and resolves google.com to web mode', () => {
  const searchTarget = resolveOmniboxInput('تحميل جوجل كروم');
  assert.equal(searchTarget.mode, 'search');
  if (searchTarget.mode === 'search') {
    assert.equal(searchTarget.query, 'تحميل جوجل كروم');
  }

  const webTarget = resolveOmniboxInput('https://www.google.com/');
  assert.equal(webTarget.mode, 'web');
  if (webTarget.mode === 'web') {
    assert.equal(webTarget.url, 'https://www.google.com/');
  }
});
