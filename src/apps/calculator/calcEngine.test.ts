import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyBitwiseOp,
  applyScientificOp,
  convertBase,
  convertUnit,
  evaluateExpression,
} from './calcEngine';

test('evaluateExpression respects operator precedence, parentheses, and unary minus', () => {
  assert.equal(evaluateExpression('2 + 3 * 4'), 14);
  assert.equal(evaluateExpression('(2 + 3) * 4'), 20);
  assert.equal(evaluateExpression('2 ^ 3 + 1'), 9);
  assert.equal(evaluateExpression('-5 + 12'), 7);
  assert.equal(evaluateExpression('125 * 8'), 1000);
  assert.throws(() => evaluateExpression('10 / 0'), /Division by zero/);
});

test('scientific operations compute trig, roots, logs, and factorials', () => {
  assert.equal(applyScientificOp('sin', 30, 'DEG'), 0.5);
  assert.equal(applyScientificOp('cos', 0, 'RAD'), 1);
  assert.equal(applyScientificOp('sqrt', 144), 12);
  assert.equal(applyScientificOp('fact', 5), 120);
  assert.equal(applyScientificOp('log', 1000), 3);
});

test('programmer base conversion and bitwise operations work accurately', () => {
  const bases = convertBase('255', 'DEC');
  assert.equal(bases.HEX, 'FF');
  assert.equal(bases.BIN, '11111111');
  assert.equal(bases.OCT, '377');
  assert.equal(applyBitwiseOp(0b1010, 0b1100, 'AND'), 0b1000);
  assert.equal(applyBitwiseOp(0b1010, 0b1100, 'XOR'), 0b0110);
});

test('unit converter handles length, storage, and temperature', () => {
  assert.equal(convertUnit(1, 'length', 'km', 'm'), 1000);
  assert.equal(convertUnit(1, 'storage', 'GB', 'MB'), 1024);
  assert.equal(convertUnit(100, 'temperature', 'C', 'F'), 212);
  assert.equal(convertUnit(0, 'temperature', 'C', 'K'), 273.15);
});
