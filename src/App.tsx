import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { Moon, Sun } from 'lucide-react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
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

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
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

 const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true
  });

  useEffect(() => {
    if (!roomId || !username) return;

    const socket = getSocket();
    setIsLoading(true);

    const doc = new Y.Doc();
    const provider = new WebrtcProvider(`collaborative-editor-${roomId}`, doc);
    const type = doc.getText('monaco');

    socket.emit('join-room', { roomId, username });

    socket.on('connect', () => {
      setIsConnected(true);
      setIsLoading(false);
    });

    socket.on('connect_error', () => {
      setIsLoading(false);
    });

    return () => {
      provider.destroy();
      socket.disconnect();
      setIsConnected(false);
    };
  }, [roomId, username]);

  const handleAskAI = useCallback(async (query: string) => {
    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: query }],
        model: currentModel,
        temperature: 0.7,
        max_tokens: 1024,
      });

      const response = completion.choices[0]?.message?.content || 'No response from AI';
      setAiResponse(response);
    } catch (error) {
      console.error('Error from AI:', error);
      setAiResponse('Sorry, there was an error processing your request.');
    }
  }, [groq, currentModel]);

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

    setFiles(deleteFromFiles(files));
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
  };

  const handleFileSelect = (file: FileNode) => {
    if (file.type === 'file') {
      setActiveFile(file);
      setCode(file.content || '');
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleCreateRoom = () => {
    const newRoomId = uuidv4();
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Connecting to room...</p>
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
        className="flex items-center justify-between p-4 border-b-2 border-black bg-white dark:bg-gray-900"
      >
        <h1 className="text-2xl font-bold">CodeCollab</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            Room ID: <span className="font-mono">{roomId}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="neo-brutal p-2 bg-yellow-300 dark:bg-blue-600"
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
          className="flex-1 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Editor
            height="100%"
            defaultLanguage="typescript"
            theme={isDarkMode ? 'vs-dark' : 'light'}
            value={code}
            onChange={(value) => setCode(value || '')}
            className="neo-brutal-lg m-4"
          />
        </motion.div>

        <UserList
          roomId={roomId}
          onVideoCall={handleVideoCall}
          onVoiceCall={handleVoiceCall}
        />

        <AnimatePresence>
          {isChatOpen && (
            <Chat roomId={roomId} username={username} />
          )}
        </AnimatePresence>

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
              userId={username}
              username={username}
              isVisible={isVideoCallOpen}
              onClose={() => setIsVideoCallOpen(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAIOpen && (
            <AIAssistant
              onClose={() => setIsAIOpen(false)}
              aiResponse={aiResponse}
              onAskAI={handleAskAI}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default App;