import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultVfsTree, readFileContent } from '../../vfs/treeOps';
import { executeTerminalCommand } from './terminalEngine';

test('terminal commands navigate directories, create files/folders, and compute expressions', () => {
  let tree = createDefaultVfsTree();
  let cwd = '/home/user';

  const cdRes = executeTerminalCommand('cd Documents', cwd, tree);
  cwd = cdRes.nextCwd;
  assert.equal(cwd, '/home/user/Documents');

  const mkRes = executeTerminalCommand('mkdir reports', cwd, tree);
  assert.ok(mkRes.nextTree);
  tree = mkRes.nextTree!;

  const echoRes = executeTerminalCommand('echo "Quarterly metrics" > reports/q4.txt', cwd, tree);
  assert.ok(echoRes.nextTree);
  tree = echoRes.nextTree!;

  assert.equal(
    readFileContent(tree, '/home/user/Documents/reports/q4.txt').content,
    'Quarterly metrics'
  );

  const calcRes = executeTerminalCommand('calc (15 + 5) * 3', cwd, tree);
  assert.equal(calcRes.lines[0].text, '= 60');

  const openRes = executeTerminalCommand('open calc', cwd, tree);
  assert.equal(openRes.openApp?.appId, 'calculator');
});
