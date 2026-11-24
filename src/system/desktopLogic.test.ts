import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DESKTOP_CELL_H,
  DESKTOP_CELL_W,
  DESKTOP_ORIGIN_X,
  DESKTOP_ORIGIN_Y,
  buildUniqueCopyName,
  cellKey,
  cellToPixels,
  getDefaultSlotForIndex,
  snapToDesktopGrid,
} from './desktopLogic';

test('getDefaultSlotForIndex fills vertical columns cleanly without exceeding viewport', () => {
  const slot0 = getDefaultSlotForIndex(0, 900);
  const slot1 = getDefaultSlotForIndex(1, 900);
  assert.deepEqual(slot0, { col: 0, row: 0 });
  assert.deepEqual(slot1, { col: 0, row: 1 });

  const pixels = cellToPixels({ col: 2, row: 3 });
  assert.equal(pixels.x, DESKTOP_ORIGIN_X + 2 * DESKTOP_CELL_W);
  assert.equal(pixels.y, DESKTOP_ORIGIN_Y + 3 * DESKTOP_CELL_H);
});

test('snapToDesktopGrid snaps to dragged cell and avoids occupied slots', () => {
  const occupied = new Set([cellKey({ col: 2, row: 1 })]);
  const freeCell = snapToDesktopGrid(
    DESKTOP_ORIGIN_X + 3 * DESKTOP_CELL_W,
    DESKTOP_ORIGIN_Y + 2 * DESKTOP_CELL_H,
    1440,
    900,
    occupied
  );
  assert.deepEqual(freeCell, { col: 3, row: 2 });

  const displaced = snapToDesktopGrid(
    DESKTOP_ORIGIN_X + 2 * DESKTOP_CELL_W,
    DESKTOP_ORIGIN_Y + 1 * DESKTOP_CELL_H,
    1440,
    900,
    occupied
  );
  assert.notDeepEqual(displaced, { col: 2, row: 1 });
});

test('buildUniqueCopyName generates non-colliding Arabic and English copy names', () => {
  const existing = ['notes.txt', 'notes - نسخة.txt'];
  assert.equal(buildUniqueCopyName('notes.txt', existing, true), 'notes - نسخة (2).txt');
  assert.equal(buildUniqueCopyName('Google Chrome', ['Google Chrome'], false), 'Google Chrome - Copy');
});
