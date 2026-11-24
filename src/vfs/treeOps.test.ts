import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultVfsTree,
  createFolder,
  deleteNode,
  listDirectory,
  normalizePath,
  readFileContent,
  renameNode,
  searchNodes,
  writeFile,
} from './treeOps';

test('normalizePath resolves relative, parent, and absolute segments', () => {
  assert.equal(normalizePath('Documents/..', '/home/user'), '/home/user');
  assert.equal(normalizePath('../Projects/./roadmap.txt', '/home/user/Documents'), '/home/user/Projects/roadmap.txt');
  assert.equal(normalizePath('/home/user', '/home/user/Notes'), '/home/user');
  assert.equal(normalizePath('../../../../..', '/home/user'), '/');
});

test('default VFS tree seeds expected folders and files', () => {
  const tree = createDefaultVfsTree();
  const homeEntries = listDirectory(tree, '/home/user');
  assert.deepEqual(
    homeEntries.map((e) => e.name),
    ['Documents', 'Notes', 'Projects']
  );
  const welcome = readFileContent(tree, '/home/user/Documents/welcome.md');
  assert.equal(welcome.ok, true);
  assert.ok(welcome.content?.includes('Welcome to NizamOS'));
});

test('createFolder, writeFile, renameNode, deleteNode mutate immutably and enforce rules', () => {
  const tree = createDefaultVfsTree();

  const mk = createFolder(tree, '/home/user', 'Workspace');
  assert.equal(mk.ok, true);
  assert.equal(listDirectory(tree, '/home/user').length, 3); // original unchanged

  const wf = writeFile(mk.tree, '/home/user/Workspace', 'spec.txt', 'hello world');
  assert.equal(wf.ok, true);
  assert.equal(readFileContent(wf.tree, '/home/user/Workspace/spec.txt').content, 'hello world');

  const rn = renameNode(wf.tree, '/home/user/Workspace/spec.txt', 'notes.txt');
  assert.equal(rn.ok, true);
  assert.equal(readFileContent(rn.tree, '/home/user/Workspace/notes.txt').content, 'hello world');
  assert.equal(readFileContent(rn.tree, '/home/user/Workspace/spec.txt').ok, false);

  const delProtected = deleteNode(rn.tree, '/home/user');
  assert.equal(delProtected.ok, false);

  const del = deleteNode(rn.tree, '/home/user/Workspace');
  assert.equal(del.ok, true);
  assert.equal(listDirectory(del.tree, '/home/user').length, 3);
});

test('searchNodes finds matching files across nested directories', () => {
  const tree = createDefaultVfsTree();
  const matches = searchNodes(tree, 'calc');
  assert.ok(matches.some((m) => m.path === '/home/user/Projects/calculator-modules.md'));
});
