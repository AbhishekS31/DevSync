import React, { useState } from 'react';
import { Plus, File, Folder, ChevronDown, ChevronRight, MoreVertical, FileCode, FileText, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'js':
    case 'jsx':
      return <FileCode size={16} className="mr-2 text-yellow-500" />;
    case 'ts':
    case 'tsx':
      return <FileCode size={16} className="mr-2 text-blue-500" />;
    case 'css':
      return <FileCode size={16} className="mr-2 text-purple-500" />;
    case 'html':
      return <FileCode size={16} className="mr-2 text-orange-500" />;
    case 'json':
      return <FileCode size={16} className="mr-2 text-green-500" />;
    case 'md':
      return <FileText size={16} className="mr-2 text-gray-500" />;
    default:
      return <File size={16} className="mr-2 text-gray-500" />;
  }
};

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
  const [isHovered, setIsHovered] = useState(false);

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    onFileRename(node.id, newName);
    setIsRenaming(false);
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <motion.div
            className={`flex items-center px-2 py-1.5 rounded-md ${
              isHovered ? 'bg-gray-100 dark:bg-gray-800' : ''
            } cursor-pointer transition-colors duration-150`}
            style={{ paddingLeft: `${level * 12}px` }}
            onClick={() => node.type === 'file' ? onSelect(node) : setIsExpanded(!isExpanded)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileHover={{ x: 2 }}
          >
            {node.type === 'folder' && (
              <button className="p-1">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            {node.type === 'folder' ? (
              isExpanded ? (
                <FolderOpen size={16} className="mr-2 text-blue-500" />
              ) : (
                <Folder size={16} className="mr-2 text-blue-500" />
              )
            ) : (
              getFileIcon(node.name)
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
              <span className="flex-1 text-sm">{node.name}</span>
            )}
          </motion.div>
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
      <AnimatePresence>
        {node.type === 'folder' && isExpanded && node.children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
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
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      onFileCreate(null, newItemName, 'file');
      setNewItemName('');
      setIsCreatingFile(false);
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      onFileCreate(null, newItemName, 'folder');
      setNewItemName('');
      setIsCreatingFolder(false);
    }
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r-2 border-black p-2">
      <div className="flex justify-between items-center mb-4 px-2 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-md">
        <span className="font-bold">Explorer</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsCreatingFile(true);
              setIsCreatingFolder(false);
            }}
            className="hover:bg-white/20 text-white"
          >
            <File size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsCreatingFolder(true);
              setIsCreatingFile(false);
            }}
            className="hover:bg-white/20 text-white"
          >
            <Folder size={16} />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isCreatingFile && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleCreateFile}
            className="mb-2 px-2"
          >
            <div className="flex">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="File name"
                className="flex-1 p-1 text-sm neo-brutal bg-white dark:bg-gray-800 rounded"
                autoFocus
                onBlur={() => setIsCreatingFile(false)}
              />
              <Button type="submit" size="sm" className="ml-1 neo-brutal">
                Add
              </Button>
            </div>
          </motion.form>
        )}

        {isCreatingFolder && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleCreateFolder}
            className="mb-2 px-2"
          >
            <div className="flex">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Folder name"
                className="flex-1 p-1 text-sm neo-brutal bg-white dark:bg-gray-800 rounded"
                autoFocus
                onBlur={() => setIsCreatingFolder(false)}
              />
              <Button type="submit" size="sm" className="ml-1 neo-brutal">
                Add
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-1 mt-2">
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