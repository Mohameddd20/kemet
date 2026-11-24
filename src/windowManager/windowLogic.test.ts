import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAXIMIZED_TASKBAR_HEIGHT,
  SAFE_BOTTOM,
  SAFE_LEFT,
  SAFE_RIGHT,
  SAFE_TOP,
  clampWindowBounds,
  computeCascadedBounds,
  computeSnapBounds,
  getMaximizedBounds,
  getSafeWorkspaceRect,
} from './windowLogic';

test('getSafeWorkspaceRect reserves Top Bar and Left Dock gutters', () => {
  const rect = getSafeWorkspaceRect(1440, 900);
  assert.equal(rect.x, SAFE_LEFT);
  assert.equal(rect.y, SAFE_TOP);
  assert.equal(rect.width, 1440 - SAFE_LEFT - SAFE_RIGHT);
  assert.equal(rect.height, 900 - SAFE_TOP - SAFE_BOTTOM);
});

test('getMaximizedBounds covers full desktop edge-to-edge above bottom taskbar', () => {
  const maxRect = getMaximizedBounds(1440, 900);
  assert.equal(maxRect.x, 0);
  assert.equal(maxRect.y, 0);
  assert.equal(maxRect.width, 1440);
  assert.equal(maxRect.height, 900 - MAXIMIZED_TASKBAR_HEIGHT);
});

test('clampWindowBounds prevents dragging under TopTelemetryBar or LeftHexDock', () => {
  const clamped = clampWindowBounds({ x: 10, y: 8, width: 800, height: 600 }, 1440, 900);
  assert.ok(clamped.x >= SAFE_LEFT);
  assert.ok(clamped.y >= SAFE_TOP);
});

test('computeCascadedBounds stays strictly inside safe viewport area', () => {
  for (let i = 0; i < 6; i++) {
    const b = computeCascadedBounds(i, 960, 620, 1440, 900);
    assert.ok(b.x >= SAFE_LEFT);
    assert.ok(b.y >= SAFE_TOP);
    assert.ok(b.x + b.width <= 1440 - SAFE_RIGHT);
    assert.ok(b.y + b.height <= 900 - SAFE_BOTTOM);
  }
});

test('computeSnapBounds splits left and right halves inside safe workspace and maximizes full edge-to-edge', () => {
  const left = computeSnapBounds('left', 1440, 900);
  const right = computeSnapBounds('right', 1440, 900);
  const full = computeSnapBounds('full', 1440, 900);

  assert.equal(left.x, SAFE_LEFT);
  assert.equal(left.y, SAFE_TOP);
  assert.ok(left.x + left.width < right.x);
  assert.equal(right.x + right.width, 1440 - SAFE_RIGHT);
  assert.equal(full.x, 0);
  assert.equal(full.y, 0);
  assert.equal(full.width, 1440);
  assert.equal(full.height, 900 - MAXIMIZED_TASKBAR_HEIGHT);
});

test('compact mobile viewports fit windows inside viewport width without horizontal clipping', () => {
  const rect = getSafeWorkspaceRect(390, 844);
  assert.ok(rect.x >= 10);
  assert.ok(rect.x + rect.width <= 390);

  const cascaded = computeCascadedBounds(0, 960, 620, 390, 844);
  assert.ok(cascaded.x >= rect.x);
  assert.ok(cascaded.x + cascaded.width <= 390);
  assert.ok(cascaded.y + cascaded.height <= 844 - 68);
});

