import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { Moon, Sun, Share2, Users, Code2 } from 'lucide-react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { MonacoBinding } from 'y-monaco';
import { v4 as uuidv4 } from 'uuid';
import { Navbar } from './components/Navbar';
import { FileExplorer } from './components/FileExplorer';
import { Chat } from './components/Chat';
import { VideoCall } from './components/VideoCall';
import { Terminal } from './components/Terminal';
import { OnboardingModal } from './components/OnboardingModal';
import { UserList } from './components/UserList';
import { AIAssistant } from './components/AIAssistant';
import { getSocket } from './lib/socket';
import { Groq } from 'groq-sdk';
import * as monaco from 'monaco-editor';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
}

interface User {
  id: string;
  username: string;
  color?: string;
}

const initialFiles: FileNode[] = [
  {
    id: '1',
    name: 'src',
    type: 'folder',
    children: [
      { id: '2', name: 'App.tsx', type: 'file', content: '// Your code here' },
      { id: '3', name: 'main.tsx', type: 'file', content: '// Entry point' },
      {
        id: '4',
        name: 'components',
        type: 'folder',
        children: [
          { id: '5', name: 'Navbar.tsx', type: 'file' },
          { id: '6', name: 'FileExplorer.tsx', type: 'file' }
        ]
      }
    ]
  }
];

// Array of colors for user cursors
const userColors = [
  '#FF5733', // Red-Orange
  '#33FF57', // Green
  '#3357FF', // Blue
  '#FF33F5', // Pink
  '#33FFF5', // Cyan
  '#F5FF33', // Yellow
  '#FF5733', // Orange
  '#8A33FF', // Purple
  '#FF8A33', // Amber
  '#33FFAA'  // Teal
];

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [code, setCode] = useState('// Start coding here...');
  const [files, setFiles] = useState<FileNode[]>(initialFiles);
  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('files');
  const [roomId, setRoomId] = useState<string>('');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [currentModel, setCurrentModel] = useState('mixtral-8x7b-32768');
  const [users, setUsers] = useState<User[]>([]);
  const [sharedFiles, setSharedFiles] = useState<FileNode[]>([]);
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [showShareModal, setShowShareModal] = useState(false);
  
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true
  });

  // Function to handle editor mounting
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    if (ydocRef.current && activeFile) {
      // Get or create a Y.Text for this file
      const ytext = ydocRef.current.getText(`file-${activeFile.id}`);
      
      // If this is a new file, initialize it with content
      if (ytext.toString() === '' && activeFile.content) {
        ytext.insert(0, activeFile.content);
      }
      
      // Create a new binding between Monaco and the Y.Text
      const binding = new MonacoBinding(
        ytext,
        editor.getModel()!,
        new Set([editor]),
        providerRef.current!.awareness
      );
      
      bindingRef.current = binding;
      
      // Set up awareness (cursor tracking)
      providerRef.current!.awareness.setLocalStateField('user', {
        name: username,
        color: userColors[Math.floor(Math.random() * userColors.length)]
      });
    }
  };

  useEffect(() => {
    if (!roomId || !username) return;

    const socket = getSocket();
    setIsLoading(true);

    // Create a new Y.Doc instance
    const doc = new Y.Doc();
    ydocRef.current = doc;
    
    // Create a WebRTC provider
    const provider = new WebrtcProvider(`collaborative-editor-${roomId}`, doc, {
      signaling: ['wss://signaling.yjs.dev']
    });
    providerRef.current = provider;

    // Listen for initial file system state from server
    socket.on('initial-file-system', (initialFiles: FileNode[]) => {
      if (initialFiles && initialFiles.length > 0) {
        setFiles(initialFiles);
      }
    });

    // Listen for file system updates
    socket.on('fs-update', (updatedFiles: FileNode[]) => {
      setFiles(updatedFiles);
    });

    // Listen for file content updates
    socket.on('file-content-updated', ({ fileId, content }) => {
      setFiles(prevFiles => {
        const updateContentInFiles = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => {
            if (node.id === fileId) {
              return { ...node, content };
            }
            if (node.children) {
              return {
                ...node,
                children: updateContentInFiles(node.children)
              };
            }
            return node;
          });
        };
        
        return updateContentInFiles(prevFiles);
      });
      
      // If this is the currently active file, update the code
      if (activeFile && activeFile.id === fileId) {
        setCode(content);
      }
    });

    // Listen for file sharing events
    socket.on('file-shared', (sharedFile: FileNode) => {
      setFiles(prevFiles => {
        // Check if file already exists
        const fileExists = findFileById(prevFiles, sharedFile.id);
        if (fileExists) return prevFiles;
        
        // Add the new file
        return [...prevFiles, sharedFile];
      });
    });

    // Listen for user awareness updates
    provider.awareness.on('change', () => {
      const states = Array.from(provider.awareness.getStates().entries());
      const connectedUsers: User[] = states
        .filter(([_, state]) => state.user)
        .map(([clientId, state]) => ({
          id: clientId.toString(),
          username: state.user.name,
          color: state.user.color
        }));
      
      setUsers(connectedUsers);
    });

    socket.emit('join-room', { roomId, username });
    socket.emit('fs-update', { roomId, files });

    socket.on('connect', () => {
      setIsConnected(true);
      setIsLoading(false);
    });

    socket.on('connect_error', () => {
      setIsLoading(false);
    });

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
      
      if (providerRef.current) {
        providerRef.current.destroy();
      }
      
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
      
      socket.disconnect();
      setIsConnected(false);
      
      socket.off('initial-file-system');
      socket.off('fs-update');
      socket.off('file-content-updated');
      socket.off('file-shared');
    };
  }, [roomId, username]);

  // Effect to update the editor binding when the active file changes
  useEffect(() => {
    if (!editorRef.current || !ydocRef.current || !providerRef.current || !activeFile) return;
    // Clean up previous binding
    if (bindingRef.current) {
      bindingRef.current.destroy();
    }
    // Get or create a Y.Text for this file
    const ytext = ydocRef.current.getText(`file-${activeFile.id}`);
    // If this is a new file, initialize it with content
    if (ytext.toString() === '' && activeFile.content) {
      ytext.insert(0, activeFile.content);
    }
    // Create a new binding
    const binding = new MonacoBinding(
      ytext,
      editorRef.current.getModel()!,
      new Set([editorRef.current]),
      providerRef.current.awareness
    );
    bindingRef.current = binding;
      
  }, [activeFile]);

  const findFileById = (fileArray: FileNode[], id: string): FileNode | null => {
    for (const file of fileArray) {
      if (file.id === id) return file;
      if (file.children) {
        const found = findFileById(file.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleAskAI = useCallback(async (query: string) => {
    try {
      // Create a new headers object
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
      });

      // Make a direct fetch call to the Groq API
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: currentModel,
          messages: [{ role: 'user', content: query }],
          temperature: 0.7,
          max_tokens: 1024,
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content || 'No response from AI';
      setAiResponse(aiText);
    } catch (error) {
      console.error('Error from AI:', error);
      setAiResponse('Sorry, there was an error processing your request.');
    }
  }, [currentModel]);

  const handleFileCreate = (parentId: string | null, name: string, type: 'file' | 'folder') => {
    const newNode: FileNode = {
      id: uuidv4(),
      name,
      type,
      ...(type === 'folder' ? { children: [] } : { content: '' })
    };

    if (!parentId) {
      setFiles([...files, newNode]);
    } else {
      const updateFiles = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === parentId) {
            return {
              ...node,
              children: [...(node.children || []), newNode]
            };
          }
          if (node.children) {
            return {
              ...node,
              children: updateFiles(node.children)
            };
          }
          return node;
        });
      };

      setFiles(updateFiles(files));
    }

    // Share the new file with other users
    const socket = getSocket();
    if (socket && roomId) {
      socket.emit('share-file', { roomId, file: newNode });
    }
  };

  const handleFileDelete = (id: string) => {
    const deleteFromFiles = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(node => {
        if (node.id === id) return false;
        if (node.children) {
          node.children = deleteFromFiles(node.children);
        }
        return true;
      });
    };

    const updatedFiles = deleteFromFiles(files);
    setFiles(updatedFiles);

    // Sync the delete with other users
    const socket = getSocket();
    if (socket && roomId) {
      socket.emit('file-delete', { roomId, fileId: id });
    }
  };

  const handleFileRename = (id: string, newName: string) => {
    const renameInFiles = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, name: newName };
        }
        if (node.children) {
          return {
            ...node,
            children: renameInFiles(node.children)
          };
        }
        return node;
      });
    };

    setFiles(renameInFiles(files));

    // Sync the rename with other users
    const socket = getSocket();
    if (socket && roomId) {
      socket.emit('file-rename', { roomId, fileId: id, newName });
    }
  };

  const handleFileSelect = (file: FileNode) => {
    if (file.type === 'file') {
      setActiveFile(file);
      setCode(file.content || '');
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setEditorTheme(isDarkMode ? 'vs' : 'vs-dark');
    document.documentElement.classList.toggle('dark');
  };

  const handleCreateRoom = () => {
    const newRoomId = uuidv4().substring(0, 8);
    setRoomId(newRoomId);
    setShowOnboarding(false);
  };

  const handleJoinRoom = (joinRoomId: string) => {
    setRoomId(joinRoomId);
    setShowOnboarding(false);
  };

  const handleVideoCall = (targetUserId: string) => {
    setIsVideoCallOpen(true);
  };

  const handleVoiceCall = (targetUserId: string) => {
    // Implement voice call logic here using the peer.ts functions
    console.log('Starting voice call with:', targetUserId);
  };

  const handleModelChange = (modelId: string) => {
    setCurrentModel(modelId);
  };

  const handleShareRoom = () => {
    navigator.clipboard.writeText(roomId);
    setShowShareModal(true);
    setTimeout(() => setShowShareModal(false), 3000);
  };

  const handleCodeChange = (value: string | undefined) => {
    const newValue = value || '';
    setCode(newValue);
    
    // Update the file content in the file system
    if (activeFile) {
      setFiles(prevFiles => {
        const updateContentInFiles = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => {
            if (node.id === activeFile.id) {
              return { ...node, content: newValue };
            }
            if (node.children) {
              return {
                ...node,
                children: updateContentInFiles(node.children)
              };
            }
            return node;
          });
        };
        
        return updateContentInFiles(prevFiles);
      });
      
      // Sync the content with other users
      const socket = getSocket();
      if (socket && roomId) {
        socket.emit('file-update-content', {
          roomId, 
          fileId: activeFile.id, 
          content: newValue
        });
      }
    }
  };

  if (showOnboarding) {
    return (
      <OnboardingModal
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onSetUsername={setUsername}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center text-white"
        >
          <div className="relative w-24 h-24 mx-auto mb-8">
            <motion.div 
              className="absolute inset-0 rounded-full bg-blue-500 opacity-75"
              animate={{ 
                scale: [1, 1.2, 1],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Code2 size={40} className="text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Connecting to CodeCollab</h2>
          <p className="text-lg text-blue-200">Establishing secure connection to room...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`min-h-screen bg-background ${isDarkMode ? 'dark' : ''}`}
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between p-4 border-b-2 border-black bg-gradient-to-r from-blue-600 to-purple-600 text-white"
      >
        <div className="flex items-center gap-3">
          <Code2 size={28} className="text-white" />
          <h1 className="text-2xl font-bold">DevSync 🚀</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full">
            <Users size={16} />
            <span className="text-sm font-medium">{users.length} online</span>
          </div>
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full">
            <span className="text-sm font-mono">{roomId}</span>
            <button 
              onClick={handleShareRoom}
              className="hover:bg-white/20 p-1 rounded-full transition-colors"
            >
              <Share2 size={14} />
            </button>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="neo-brutal p-2 bg-yellow-300 dark:bg-blue-600 text-black dark:text-white"
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </motion.button>
        </div>
      </motion.header>
      <div className="flex h-[calc(100vh-73px)]">
        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          onToggleVideoCall={() => setIsVideoCallOpen(!isVideoCallOpen)}
          onToggleAI={() => setIsAIOpen(!isAIOpen)}
          onRunCode={() => setIsTerminalOpen(true)}
        />

        <AnimatePresence>
          {activeTab === 'files' && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
            >
              <FileExplorer
                files={files}
                onFileSelect={handleFileSelect}
                onFileCreate={handleFileCreate}
                onFileDelete={handleFileDelete}
                onFileRename={handleFileRename}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="flex-1 flex flex-col relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute top-0 left-0 right-0 z-10 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 px-4 py-2 flex items-center">
            {activeFile && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{activeFile.name}</span>
                <span className="text-xs text-gray-500">
                  {activeFile.name.split('.').pop()?.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          <Editor
            height="100%"
            defaultLanguage="typescript"
            theme={editorTheme}
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            className="neo-brutal-lg m-4 mt-12"
            options={{
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              fontFamily: "'Fira Code', monospace",
              fontLigatures: true,
              fontSize: 14,
              lineHeight: 1.5,
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              cursorSmoothCaretAnimation: 'on',
              renderWhitespace: 'selection',
              renderLineHighlight: 'all',
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true }
            }}
          />
        </motion.div>

        {/* Add UserList component here */}
        <UserList
          roomId={roomId}
          onVideoCall={handleVideoCall}
          onVoiceCall={handleVoiceCall}
        />
      </div>

      <AnimatePresence>
        {isTerminalOpen && (
          <Terminal
            isVisible={isTerminalOpen}
            onClose={() => setIsTerminalOpen(false)}
            currentCode={code}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVideoCallOpen && (
          <VideoCall
            roomId={roomId}
            username={username}
            isVisible={isVideoCallOpen}
            onClose={() => setIsVideoCallOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChatOpen && (
          <Chat roomId={roomId} username={username} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAIOpen && (
          <AIAssistant
            onAskAI={handleAskAI}
            aiResponse={aiResponse}
            onClose={() => setIsAIOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-50"
          >
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="29" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Room ID copied to clipboard!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-14 right-4 z-10">
        {/* Active users indicator */}
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md neo-brutal">
          <h4 className="text-sm font-semibold mb-1">Active Editors</h4>
          <div className="space-y-1">
            {users.map(user => (
              <div key={user.id} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: user.color }}
                />
                <span className="text-xs">{user.username}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default App;