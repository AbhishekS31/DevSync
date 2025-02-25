import React, { useState } from 'react';
import { Plus, File, Folder, ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from './ui/context-menu';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
}

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  onFileCreate: (parentId: string | null, name: string, type: 'file' | 'folder') => void;
  onFileDelete: (id: string) => void;
  onFileRename: (id: string, newName: string) => void;
}

interface FileTreeNodeProps {
  node: FileNode;
  onSelect: (file: FileNode) => void;
  onFileCreate: (parentId: string | null, name: string, type: 'file' | 'folder') => void;
  onFileDelete: (id: string) => void;
  onFileRename: (id: string, newName: string) => void;
  level: number;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  node,
  onSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  level,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    onFileRename(node.id, newName);
    setIsRenaming(false);
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={`flex items-center px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer`}
            style={{ paddingLeft: `${level * 12}px` }}
            onClick={() => node.type === 'file' ? onSelect(node) : setIsExpanded(!isExpanded)}
          >
            {node.type === 'folder' && (
              <button className="p-1">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            {node.type === 'folder' ? (
              <Folder size={16} className="mr-2 text-blue-500" />
            ) : (
              <File size={16} className="mr-2 text-gray-500" />
            )}
            {isRenaming ? (
              <form onSubmit={handleRename} className="flex-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 px-1 neo-brutal"
                  autoFocus
                  onBlur={() => setIsRenaming(false)}
                />
              </form>
            ) : (
              <span className="flex-1">{node.name}</span>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {node.type === 'folder' && (
            <>
              <ContextMenuItem onClick={() => onFileCreate(node.id, 'New File', 'file')}>
                New File
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onFileCreate(node.id, 'New Folder', 'folder')}>
                New Folder
              </ContextMenuItem>
            </>
          )}
          <ContextMenuItem onClick={() => setIsRenaming(true)}>
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onFileDelete(node.id)}>
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              onSelect={onSelect}
              onFileCreate={onFileCreate}
              onFileDelete={onFileDelete}
              onFileRename={onFileRename}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
}) => {
  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r-2 border-black p-2">
      <div className="flex justify-between items-center mb-2 px-2">
        <span className="font-bold">Explorer</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFileCreate(null, 'New File', 'file')}
        >
          <Plus size={16} />
        </Button>
      </div>
      <div className="space-y-1">
        {files.map((file) => (
          <FileTreeNode
            key={file.id}
            node={file}
            onSelect={onFileSelect}
            onFileCreate={onFileCreate}
            onFileDelete={onFileDelete}
            onFileRename={onFileRename}
            level={0}
          />
        ))}
      </div>
    </div>
  );
};