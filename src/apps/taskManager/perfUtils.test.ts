import test from 'node:test';
import assert from 'node:assert/strict';
import type { WindowAppProps, WindowInstance } from '../../windowManager/types';
import {
  buildSvgPolylinePoints,
  computeSystemSample,
  estimateProcessMetrics,
  pushMetricSample,
} from './perfUtils';

const Dummy = (_p: WindowAppProps) => null;

const MOCK_WINDOWS: WindowInstance[] = [
  {
    id: 'w-files',
    appId: 'files',
    title: 'File Manager',
    component: Dummy,
    isMinimized: false,
    isMaximized: false,
    zIndex: 101,
    x: 100,
    y: 40,
    width: 720,
    height: 480,
  },
  {
    id: 'w-browser',
    appId: 'browser',
    title: 'Web Browser',
    component: Dummy,
    isMinimized: true,
    isMaximized: false,
    zIndex: 100,
    x: 160,
    y: 80,
    width: 820,
    height: 540,
  },
];

test('estimateProcessMetrics reflects active and minimized window states', () => {
  const rows = estimateProcessMetrics(MOCK_WINDOWS, 'w-files', 3);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].status, 'Active');
  assert.equal(rows[1].status, 'Minimized');
  assert.ok(rows[0].cpuPercent > 0);
  assert.ok(rows[1].memoryMb > 0);

  const sysOnline = computeSystemSample(rows, true, 3);
  const sysOffline = computeSystemSample(rows, false, 3);
  assert.ok(sysOnline.memoryMb > 240);
  assert.equal(sysOffline.networkKbps, 0);
});

test('pushMetricSample bounds history and buildSvgPolylinePoints formats coordinates', () => {
  let series = [10, 20, 30];
  series = pushMetricSample(series, 40, 3);
  assert.deepEqual(series, [20, 30, 40]);

  const pts = buildSvgPolylinePoints([0, 50, 100], 200, 100, 100);
  assert.equal(pts, '0.0,100.0 100.0,50.0 200.0,0.0');
});
