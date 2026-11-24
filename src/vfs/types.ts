export type VfsNodeType = 'file' | 'folder';

export interface VfsBaseNode {
  id: string;
  name: string;
  type: VfsNodeType;
  createdAt: number;
  updatedAt: number;
}

export interface VfsFileNode extends VfsBaseNode {
  type: 'file';
  content: string;
}

export interface VfsFolderNode extends VfsBaseNode {
  type: 'folder';
  children: Record<string, VfsNode>;
}

export type VfsNode = VfsFileNode | VfsFolderNode;

export interface VfsEntry {
  path: string;
  node: VfsNode;
}

export interface VfsOpResult<T = VfsFolderNode> {
  ok: boolean;
  tree: VfsFolderNode;
  data?: T;
  error?: string;
}
